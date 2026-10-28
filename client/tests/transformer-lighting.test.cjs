const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');

const source = fs.readFileSync(path.join(__dirname,
    '../src/Experience/World/TransformerLighting.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default class', 'class');
const Lighting = vm.runInNewContext(`${source}\nTransformerLighting`, { THREE, Uint8Array, Math });

// Use the actual export's IDs, bounds and material assignments, without a browser/image decoder.
const bytes = fs.readFileSync(path.join(__dirname, '../static/models/Transformator/glb/Transformator.glb'));
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const ids = gltf.nodes.map(node => node.extras?.museumPartId).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'exported part IDs are unique');
assert.ok(gltf.animations.some(animation => animation.name === 'generator'));
assert.ok(gltf.images.every(image => image.bufferView !== undefined), 'textures embedded in GLB');
const model = new THREE.Group();
const originals = [];
const shared = new Map();
for (const node of gltf.nodes.filter(node => /^(sijalica|cev)_\d+$/.test(node.extras?.museumPartId))) {
    const primitive = gltf.meshes[node.mesh].primitives[0];
    const definition = gltf.materials[primitive.material];
    assert.ok(definition.emissiveFactor.some(value => value > 0), 'emission color exported');
    if (!shared.has(primitive.material)) shared.set(primitive.material, new THREE.MeshStandardMaterial({
        emissive: new THREE.Color().fromArray(definition.emissiveFactor), emissiveIntensity: 1
    }));
    const bounds = gltf.accessors[primitive.attributes.POSITION];
    const geometry = new THREE.BoxGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...bounds.min, ...bounds.max], 3));
    const mesh = new THREE.Mesh(geometry, shared.get(primitive.material));
    mesh.userData = { ...node.extras };
    model.add(mesh);
    originals.push({ mesh, material: mesh.material });
}
const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
model.add(unrelated);
const lighting = new Lighting(model);
assert.equal(lighting.entries.length, 10);
assert.equal(lighting.entries.filter(entry => entry.tube).length, 4);
assert.equal(lighting.entries.filter(entry => !entry.tube).length, 6);
assert.equal(new Set(lighting.entries.map(entry => entry.materials[0])).size, 10, 'per-emitter clones');
for (const entry of lighting.entries) assert.equal(entry.materials[0].emissiveIntensity, 0);
lighting.update(1 / 60, 1, 1);
for (const entry of lighting.entries) {
    assert.ok(entry.materials[0].emissiveIntensity > 2);
    assert.ok(entry.sprites.every(sprite => sprite.visible && sprite.material.opacity > 0));
    assert.equal(entry.materials[0].museumEmission.intensity, entry.materials[0].emissiveIntensity);
}
lighting.update(0.5, 0.5, 2);
const halfway = lighting.entries[0].materials[0].emissiveIntensity;
assert.ok(halfway > 0 && halfway < 2);
for (const groups of [{ bulbs: 0, tubes: 1 }, { bulbs: 1, tubes: 0 }, { bulbs: 0, tubes: 0 }]) {
    lighting.update(1 / 60, 1, 1, groups);
    for (const entry of lighting.entries) {
        const enabled = groups[entry.tube ? 'tubes' : 'bulbs'] > 0;
        assert.equal(entry.materials[0].emissiveIntensity > 0, enabled, 'independent group emission');
        assert.ok(entry.sprites.every(sprite => sprite.visible === enabled), 'independent group halos');
    }
}
lighting.update(0, 0, 1, { bulbs: 1, tubes: 1 });
assert.ok(lighting.entries.every(entry => entry.materials[0].emissiveIntensity === 0), 'master switch overrides both groups');
lighting.update(0, 1, 1, { bulbs: 0, tubes: 1 });
assert.ok(lighting.entries.filter(entry => !entry.tube).every(entry => entry.materials[0].emissiveIntensity === 0), 'master restart preserves disabled bulbs');
lighting.update(1 / 60, 0, 1);
for (const entry of lighting.entries) {
    assert.equal(entry.materials[0].emissiveIntensity, 0);
    assert.ok(entry.sprites.every(sprite => !sprite.visible && sprite.material.opacity === 0));
}
// Hotspot highlighting must use the live emission, not restore the exported "on" state.
const hotspotSource = fs.readFileSync(path.join(__dirname, '../src/Experience/World/Hotspot.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export class', 'class');
const Hotspot = vm.runInNewContext(`${hotspotSource}\nHotspot`, { THREE });
const hotspot = Object.create(Hotspot.prototype);
const emitter = lighting.entries[0];
Object.assign(hotspot, {
    progress: { line: 0, panel: 0, glow: 0 }, hoverGlow: { value: 0 },
    materials: [{ child: emitter.mesh, baselines: [{ color: new THREE.Color('white'), intensity: 1 }] }],
    glowColor: new THREE.Color('cyan'), projected: new THREE.Vector3(), anchor: new THREE.Vector3(0, 0, 100),
    target: new THREE.Object3D(), svg: { style: {} }, panel: { style: {} }
});
hotspot.update(new THREE.PerspectiveCamera(), { width: 100, height: 100 });
assert.equal(emitter.materials[0].emissiveIntensity, 0, 'hotspot does not relight a switched-off lamp');
lighting.update(1 / 60, 1, 1);
const litIntensity = emitter.materials[0].emissiveIntensity;
hotspot.update(new THREE.PerspectiveCamera(), { width: 100, height: 100 });
assert.equal(emitter.materials[0].emissiveIntensity, litIntensity, 'hotspot preserves live on intensity');
for (const material of shared.values()) assert.equal(material.emissiveIntensity, 1, 'cached material unchanged');
lighting.dispose();
for (const { mesh, material } of originals) {
    assert.equal(mesh.material, material);
    assert.equal(mesh.children.length, 0, 'halos removed');
}
const reopened = new Lighting(model);
assert.equal(reopened.entries.length, 10, 'cached model can be reopened');
reopened.dispose();
console.log('Transformer GLB and lighting: 6 bulbs, 4 tubes; emission, fade, halos, isolation, cleanup and reopen passed.');
