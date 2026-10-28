const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname,
    '../src/Experience/World/behaviors/TransformerBehavior.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default class', 'class');
const Behavior = vm.runInNewContext(`${source}\nTransformerBehavior`, {
    THREE, gsap: { killTweensOf() {}, to(target, values) { target.powerLevel = values.powerLevel; } }
});
function create() {
    const rotor = new THREE.Object3D();
    rotor.name = 'rotor';
    const model = new THREE.Group();
    model.add(rotor);
    const behavior = Object.create(Behavior.prototype);
    behavior.controlsParams = { power: true, bulbs: false, tubes: true };
    behavior.lightLevels = { bulbs: 0, tubes: 1 };
    behavior.exhibit = {
        model, time: { delta: 100 }, resource: { animations: [new THREE.AnimationClip('generator', 2, [
            new THREE.NumberKeyframeTrack('rotor.rotation[z]', [0, 2], [0, Math.PI * 2])
        ])] }
    };
    return { behavior, rotor };
}
{
    const { behavior: b, rotor } = create();
    b.setAnimation();
    b.update();
    assert.ok(rotor.rotation.z > 0);
    const angle = rotor.rotation.z;
    const time = b.animation.actions[0].time;
    b.setPower(false);
    for (let i = 0; i < 30; i++) b.update();
    assert.equal(rotor.rotation.z, angle, 'generator stops immediately');
    assert.equal(b.animation.actions[0].time, time, 'clip stays at current time');
    assert.equal(b.powerLevel, 0);
    b.setPower(true);
    b.update();
    assert.ok(rotor.rotation.z > angle, 'generator continues from its paused pose');
    assert.equal(b.controlsParams.bulbs, false, 'individual lighting choices preserved');
    assert.equal(b.lightLevels.bulbs, 0);
    b.dispose();
}
{
    const { behavior: b, rotor } = create();
    b.setPower(false); // User can switch off before the delayed intro starts animation.
    b.setAnimation();
    b.update();
    assert.equal(rotor.rotation.z, 0, 'late animation initialization respects off state');
    b.setPower(true);
    b.update();
    assert.ok(rotor.rotation.z > 0);
    b.dispose();
}
console.log('Transformer generator power: stop, resume, light choices and switch-off before intro passed.');
