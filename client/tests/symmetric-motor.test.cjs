const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');

// Exercise the real behavior and Three mixer with a deterministic GSAP clock.
let pending = [];
const gsap = {
    killTweensOf() {},
    to(action, options) { action.timeScale = options.timeScale; },
    delayedCall(delay, callback) {
        const call = { delay, callback, killed: false, kill() { this.killed = true; } };
        pending.push(call);
        return call;
    }
};
const source = fs.readFileSync(path.join(__dirname,
    '../src/Experience/World/behaviors/SymmetricMotorBehavior.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default class', 'class');
const Behavior = vm.runInNewContext(`${source}\nSymmetricMotorBehavior`, {
    THREE, gsap,
    RotatingMotorBehavior: class {
        dispose() { this.animation.mixer.stopAllAction(); }
    }
});
function flush() {
    const next = pending;
    pending = [];
    next.filter((call) => !call.killed).forEach((call) => call.callback());
}
function makeBehavior() {
    pending = [];
    const model = new THREE.Group();
    const clips = [];
    for (const index of [1, 2]) {
        for (const kind of ['rotor', 'wire']) {
            const node = new THREE.Object3D();
            node.name = `${kind}${index}`;
            model.add(node);
        }
        clips.push(new THREE.AnimationClip(`pokretanje-motora-${index}`, 1, [
            new THREE.NumberKeyframeTrack(`wire${index}.position[x]`, [0, 1], [0, 1])
        ]));
        clips.push(new THREE.AnimationClip(`motor-${index}`, 2, [
            new THREE.NumberKeyframeTrack(`rotor${index}.rotation[y]`, [0, 2], [0, Math.PI * 2])
        ]));
    }
    clips.push(new THREE.AnimationClip('Take 001', 10, []));
    const behavior = Object.create(Behavior.prototype);
    const sources = [];
    behavior.exhibit = {
        model, resource: { animations: clips },
        config: { field: {
            referencePartId: 'ref1', rotationPartId: 'rot1',
            secondaryReferencePartId: 'ref2', secondaryRotationPartId: 'rot2'
        } },
        fieldContext: { root: {}, setSource(...args) { sources.push(args); } }
    };
    behavior.controlsParams = { power: true, fieldPolarity: 1, generatorIndex: 0 };
    behavior.setAnimation();
    return { behavior, sources, model };
}
{
    const { behavior: b, sources, model } = makeBehavior();
    assert.equal(b.animation.actions.length, 4, 'legacy clip excluded');
    assert.equal(b.animation.generator.getClip().name, 'motor-1');
    assert.deepEqual(sources[0], ['ref2', 'rot2']);
    assert.equal(b.phase, 'starting');
    assert.equal(b.animation.generator.timeScale, 0);
    assert.equal(b.exhibit.fieldContext.root.visible, false);
    b.animation.mixer.update(1.01);
    assert.equal(b.phase, 'generator');
    assert.equal(b.animation.generator.timeScale, 1);
    assert.equal(b.animation.motor.timeScale, 0);
    assert.equal(model.getObjectByName('wire1').position.x, 1);
    assert.equal(model.getObjectByName('wire2').position.x, 0, 'driven motor has no startup');
    assert.equal(pending[0].delay, 1.5);
    flush();
    assert.equal(b.phase, 'field');
    assert.equal(b.exhibit.fieldContext.rotationEnabled, true);
    assert.equal(b.animation.motor.timeScale, 0);
    assert.equal(pending[0].delay, 0.75);
    b.controlsParams.fieldPolarity = -1;
    flush();
    assert.equal(b.phase, 'running');
    assert.equal(b.animation.motor.timeScale, -1);
    assert.equal(pending.length, 0, 'no automatic role switching');
    b.controlsParams.generatorIndex = 1;
    b.startRotorAnimations();
    assert.deepEqual(sources[1], ['ref1', 'rot1']);
    assert.equal(b.startupAction.getClip().name, 'pokretanje-motora-2');
    b.animation.mixer.update(1.01);
    assert.equal(model.getObjectByName('wire1').position.x, 0, 'old startup pose released');
    assert.equal(model.getObjectByName('wire2').position.x, 1);
    b.dispose();
    flush();
    assert.equal(b.phase, 'generator', 'dispose cancels delayed callbacks');
}
for (const stage of ['starting', 'generator', 'field', 'running']) {
    const { behavior: b } = makeBehavior();
    if (stage !== 'starting') b.animation.mixer.update(1.01);
    if (['field', 'running'].includes(stage)) flush();
    if (stage === 'running') flush();
    b.controlsParams.power = false;
    b.stopRotorAnimations();
    b.animation.mixer.update(2);
    flush(); flush();
    assert.equal(b.phase, 'stopped');
    assert.equal(b.exhibit.fieldContext.root.visible, false);
    for (const { action } of b.animation.actions) assert.equal(action.timeScale, 0);
    b.controlsParams.generatorIndex = 1;
    b.controlsParams.power = true;
    b.startRotorAnimations();
    assert.equal(b.phase, 'starting');
    assert.equal(b.startupAction.time, 0);
    assert.equal(b.animation.generator, b.animation.rotors[1]);
    b.dispose();
}
{
    const { behavior: b } = makeBehavior();
    b.animation.mixer.update(1.01);
    b.controlsParams.generatorIndex = 1;
    b.startRotorAnimations();
    flush(); flush();
    assert.equal(b.phase, 'starting', 'role switch cancels old delayed starts');
    assert.equal(b.getPolarityAction(), null, 'polarity cannot bypass startup');
    b.dispose();
}
// Check the supplied model against the animation naming contract.
const glb = fs.readFileSync(path.join(__dirname,
    '../static/models/SymmetricalMotor/glb/Simetricni motor.glb'));
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
for (const name of ['motor-1', 'motor-2', 'pokretanje-motora-1', 'pokretanje-motora-2']) {
    assert.ok(gltf.animations.some((clip) => clip.name === name), `GLB missing ${name}`);
}
console.log('Symmetric motor sequencing, cancellation, role selection and GLB checks passed.');
// A disabled field tracks the source without accumulating a delayed angle jump.
const contextSource = fs.readFileSync(path.join(__dirname,
    '../src/Experience/World/MagneticFieldContext.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default class', 'class');
const FieldContext = vm.runInNewContext(`${contextSource}\nMagneticFieldContext`, { THREE });
const model = new THREE.Group();
const rotor = new THREE.Object3D();
model.add(rotor);
const context = new FieldContext({
    model, scene: new THREE.Scene(), time: { delta: 100 },
    partRegistry: { getRequired: () => rotor }
}, {
    phaseOffsetDegrees: 0, referencePartId: 'ref', rotationPartId: 'rot',
    rotationAxis: 'y', angleMultiplier: 1,
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }
});
context.rotationEnabled = false;
rotor.rotation.y = 0.5;
context.update();
assert.equal(context.angle, 0);
assert.equal(context.angularVelocity, 0);
context.rotationEnabled = true;
rotor.rotation.y = 0.6;
context.update();
assert.ok(Math.abs(context.angle - 0.1) < 1e-6);
context.dispose();
console.log('Field delay and rotation tracking checks passed.');

// Integrate the real mixer, behavior and field context. The generator keeps
// rotating independently; the field must follow the driven rotor's Empty.
for (const generatorIndex of [0, 1]) {
    const { behavior: b, model } = makeBehavior();
    const parts = [];
    for (const index of [1, 2]) {
        const part = model.getObjectByName(`rotor${index}`);
        part.name = `rotor${index}-part`;
        const pivot = new THREE.Group();
        pivot.name = `rotor${index}`;
        model.add(pivot);
        pivot.add(part);
        parts.push(part);
    }
    // Recreate mixer bindings after moving the animation names to the pivots.
    b.animation.mixer.stopAllAction();
    b.animation.mixer.uncacheRoot(model);
    const field = new FieldContext({
        model, scene: new THREE.Scene(), time: { delta: 100 },
        partRegistry: { getRequired: id => parts[id.endsWith('1') ? 0 : 1] }
    }, {
        phaseOffsetDegrees: 0, referencePartId: 'ref1', rotationPartId: 'rot1',
        rotationAxis: 'y', angleMultiplier: 1,
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }
    });
    b.exhibit.fieldContext = field;
    b.controlsParams.generatorIndex = generatorIndex;
    b.setAnimation();
    b.animation.mixer.update(1.01);
    field.update();
    flush(); // Field is visible, but the driven rotor has not started.
    b.animation.mixer.update(0.1);
    field.update();
    assert.equal(field.angularDelta, 0, 'field does not follow the already-running generator');
    assert.equal(field.rotationSource, parts[1 - generatorIndex]);
    flush();
    for (const speed of [0.2, 0.5, 1, -0.3, -1, 0]) {
        b.animation.motor.setEffectiveTimeScale(speed);
        for (let frame = 0; frame < 25; frame++) {
            b.animation.mixer.update(0.1);
            field.update();
            assert.ok(Math.abs(field.angularDelta - speed * Math.PI * 0.1) < 1e-5,
                `generator ${generatorIndex + 1}, speed ${speed}: field matches driven rotor`);
        }
    }
    b.stopRotorAnimations();
    b.animation.mixer.update(0.1);
    field.update();
    assert.equal(field.angularDelta, 0);
    b.dispose();
    field.dispose();
}
console.log('Driven rotor/field synchronization passed for both roles, inherited rotation, speed changes, reversal and stop.');
