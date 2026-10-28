const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
function load(relative, name) {
    const source = fs.readFileSync(path.join(__dirname, '../src/Experience/World', relative), 'utf8')
        .replace(/^import .*;\r?\n/gm, '').replace('export default class', 'class');
    return vm.runInNewContext(`${source}\n${name}`, { THREE });
}
const Context = load('MagneticFieldContext.js', 'MagneticFieldContext');
const Artistic = load('ArtisticMagneticField.js', 'ArtisticMagneticField');
const Engineering = load('EngineeringMagneticField.js', 'EngineeringMagneticField');
function makeContext(model, parts, config) {
    return new Context({ model, scene: new THREE.Scene(), time: { delta: 1000 / 60 },
        partRegistry: { getRequired(id) { assert.ok(parts.has(id), `Missing part ${id}`); return parts.get(id); } }
    }, config);
}
const transform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
for (const type of ['two-phase-motor', 'three-phase-motor', 'magnetic-motor', 'electromagnetic-motor']) {
    for (const axis of ['x', 'y', 'z']) {
        const model = new THREE.Group(), pivot = new THREE.Group(), rotor = new THREE.Object3D();
        model.add(pivot); pivot.add(rotor);
        rotor.rotation.set(0.2, 0.4, -0.7);
        const context = makeContext(model, new Map([['rotor', rotor]]), {
            referencePartId: 'rotor', rotationPartId: 'rotor', rotationAxis: axis,
            angleMultiplier: 1, phaseOffsetDegrees: 15, transform
        });
        context.update();
        let angle = 0;
        const unit = new THREE.Vector3(); unit[axis] = 1;
        for (const speed of [0, 0.2, 0.7, 1, -0.3, -1, 0]) for (let i = 0; i < 100; i++) {
            const delta = speed * 0.05;
            angle += delta;
            pivot.quaternion.setFromAxisAngle(unit, angle);
            model.rotation.y += 0.002; // Moving the exhibit must not drive its field.
            context.update();
            assert.ok(Math.abs(context.angularDelta - delta) < 1e-6, `${type} ${axis}: inherited speed`);
            assert.ok(Math.abs(context.angle - (angle + Math.PI / 12)) < 1e-6, `${type} ${axis}: no accumulated drift`);
        }
        const uniforms = () => ({ uTime: { value: 0 }, uRotorAngle: { value: 0 }, uAngularVelocity: { value: 0 } });
        const artistic = Object.create(Artistic.prototype);
        Object.assign(artistic, { fieldContext: context, config: { polePairs: 1 },
            time: { elapsed: 0 }, material: { uniforms: uniforms() }, outerMaterial: { uniforms: uniforms() } });
        artistic.update();
        const stoppedAngle = artistic.material.uniforms.uRotorAngle.value;
        const stoppedWave = artistic.material.uniforms.uTime.value;
        artistic.time.elapsed = 99999;
        artistic.update();
        assert.equal(artistic.material.uniforms.uRotorAngle.value, stoppedAngle, 'no independent pole wobble');
        assert.equal(artistic.material.uniforms.uTime.value, stoppedWave, 'no independent wave motion');
        const engineering = Object.create(Engineering.prototype);
        Object.assign(engineering, { fieldContext: context, polePairs: 1, fieldUniforms: { uTime: { value: 0 } } });
        engineering.updateFieldAngle(); engineering.updateFieldShader();
        assert.equal(engineering.fieldAngle, context.angle);
        assert.equal(engineering.fieldUniforms.uTime.value, context.angle);
        context.dispose();
    }
}
console.log('All four standard motor types: axes, inherited rotation, acceleration/reversal/stop and both field views passed.');

// Optional live audit: use backend configuration and animation data from the exact served GLBs.
async function auditBackend() {
    if (!process.argv.includes('--api')) return;
    const api = process.env.TESLA_MUSEUM_API_URL || 'http://localhost:5095/api';
    const response = await fetch(`${api}/admin/exhibits`);
    assert.ok(response.ok);
    const catalog = await response.json();
    for (const exhibit of catalog.filter(item => ['two-phase-motor', 'three-phase-motor', 'magnetic-motor', 'electromagnetic-motor'].includes(item.behaviorType))) {
        const response = await fetch(new URL(exhibit.modelPath, api));
        assert.ok(response.ok);
        const bytes = Buffer.from(await response.arrayBuffer());
        const jsonSize = bytes.readUInt32LE(12);
        const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
        const binaryOffset = 20 + jsonSize + 8;
        const objects = gltf.nodes.map(node => {
            const object = new THREE.Object3D();
            object.position.fromArray(node.translation || [0, 0, 0]);
            object.quaternion.fromArray(node.rotation || [0, 0, 0, 1]);
            object.scale.fromArray(node.scale || [1, 1, 1]);
            if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
            return object;
        });
        gltf.nodes.forEach((node, i) => (node.children || []).forEach(child => objects[i].add(objects[child])));
        const model = new THREE.Group();
        gltf.scenes[gltf.scene || 0].nodes.forEach(index => model.add(objects[index]));
        const parts = new Map(gltf.nodes.flatMap((node, i) => node.extras?.museumPartId ? [[node.extras.museumPartId, objects[i]]] : []));
        const config = exhibit.field;
        const sourceNode = parts.get(config.rotationPartId);
        assert.ok(sourceNode, `${exhibit.slug}: configured source exists`);
        assert.match(config.rotationPartId, /^rotor-motora/, `${exhibit.slug}: field must follow motor, not generator`);
        const ancestors = new Set();
        for (let node = sourceNode; node; node = node.parent) ancestors.add(node);
        function accessor(index) {
            const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
            assert.equal(a.componentType, 5126);
            const count = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
            const stride = view.byteStride || count * 4;
            const values = [];
            for (let row = 0; row < a.count; row++) for (let c = 0; c < count; c++) {
                values.push(bytes.readFloatLE(binaryOffset + (view.byteOffset || 0) + (a.byteOffset || 0) + row * stride + c * 4));
            }
            return values;
        }
        const clipData = gltf.animations.find(clip => clip.channels.some(channel => channel.target.path === 'rotation' && ancestors.has(objects[channel.target.node])));
        assert.ok(clipData, `${exhibit.slug}: source or parent has rotation animation`);
        const tracks = clipData.channels.filter(channel => channel.target.path === 'rotation').map(channel => {
            const sampler = clipData.samplers[channel.sampler];
            assert.ok(!sampler.interpolation || sampler.interpolation === 'LINEAR');
            return new THREE.QuaternionKeyframeTrack(`${objects[channel.target.node].uuid}.quaternion`, accessor(sampler.input), accessor(sampler.output));
        });
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(new THREE.AnimationClip(clipData.name, -1, tracks)).play();
        const context = makeContext(model, parts, config);
        context.update();
        const probe = new THREE.Vector3();
        probe[config.rotationAxis === 'x' ? 'y' : config.rotationAxis === 'y' ? 'z' : 'x'] = 1;
        probe.applyQuaternion(sourceNode.getWorldQuaternion(new THREE.Quaternion()).invert());
        let previousProbeAngle = 0;
        let moving = false;
        for (const speed of [0.2, 1, -1, 0]) {
            action.setEffectiveTimeScale(speed);
            for (let frame = 0; frame < 90; frame++) {
                mixer.update(1 / 60); context.update();
                const direction = probe.clone().applyQuaternion(sourceNode.getWorldQuaternion(new THREE.Quaternion()));
                const probeAngle = config.rotationAxis === 'x' ? Math.atan2(direction.z, direction.y)
                    : config.rotationAxis === 'y' ? Math.atan2(direction.x, direction.z) : Math.atan2(direction.y, direction.x);
                const actualDelta = Math.atan2(Math.sin(probeAngle - previousProbeAngle), Math.cos(probeAngle - previousProbeAngle));
                assert.ok(Math.abs(context.angularDelta - actualDelta * config.angleMultiplier) < 1e-5,
                    'field speed and direction match an independent rotor direction probe');
                previousProbeAngle = probeAngle;
                if (speed === 0) assert.ok(Math.abs(context.angularDelta) < 1e-8, 'field stops with actual GLB rotor');
                else if (Math.abs(context.angularDelta) > 1e-6) moving = true;
                assert.ok(Number.isFinite(context.angle));
            }
        }
        assert.ok(moving, 'configured axis detects the actual exported rotation');
        context.dispose(); mixer.stopAllAction();
        console.log(`Backend/GLB verified: ${exhibit.slug}, ${config.rotationPartId}, axis ${config.rotationAxis}, clip ${clipData.name}.`);
    }
}
auditBackend().catch(error => { console.error(error); process.exitCode = 1; });
