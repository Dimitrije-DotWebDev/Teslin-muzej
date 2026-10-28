import * as THREE from 'three';

// Emission is controlled at runtime; the cached GLB materials stay untouched.
export default class TransformerLighting {
    constructor(model) {
        this.entries = [];
        this.elapsed = 0;
        this.texture = this.createGlowTexture();
        model.traverse(object => {
            const id = object.userData?.museumPartId;
            if (typeof id !== 'string' || !/^(sijalica|cev)_\d+$/.test(id)) return;
            const tube = id.startsWith('cev_');
            const meshes = [];
            object.traverse(child => { if (child.isMesh) meshes.push(child); });
            for (const mesh of meshes) this.addEmitter(mesh, tube);
        });
        this.update(0, 0, 1);
    }

    createGlowTexture() {
        const size = 64;
        const pixels = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
            const offset = (y * size + x) * 4;
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
            pixels[offset + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - radius), 3));
        }
        const texture = new THREE.DataTexture(pixels, size, size);
        texture.needsUpdate = true;
        return texture;
    }

    addEmitter(mesh, tube) {
        const original = mesh.material;
        const materials = (Array.isArray(original) ? original : [original]).map(material => material.clone());
        const color = new THREE.Color(tube ? '#C1E8FF' : '#FFD59A');
        for (const material of materials) {
            if (!material.emissive) continue;
            material.emissive.copy(color);
            material.museumEmission = { color, intensity: 0 };
        }
        mesh.material = Array.isArray(original) ? materials : materials[0];
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const axis = ['x', 'y', 'z'].reduce((best, value) => size[value] > size[best] ? value : best, 'x');
        const width = tube
            ? Math.max(...['x', 'y', 'z'].filter(value => value !== axis).map(value => size[value])) * 3
            : Math.max(size.x, size.y, size.z) * 1.8;
        const sprites = [];
        const count = tube ? 5 : 1;
        for (let index = 0; index < count; index++) {
            const material = new THREE.SpriteMaterial({
                map: this.texture, color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
            });
            const sprite = new THREE.Sprite(material);
            sprite.position.copy(center);
            if (tube) sprite.position[axis] += ((index + 0.5) / count - 0.5) * size[axis];
            sprite.scale.set(width, width, 1);
            sprite.raycast = () => {};
            mesh.add(sprite);
            sprites.push(sprite);
        }
        this.entries.push({ mesh, original, materials, sprites, tube });
    }

    update(deltaSeconds, powerLevel, frequency, groups = { bulbs: 1, tubes: 1 }) {
        this.elapsed += deltaSeconds;
        const power = THREE.MathUtils.clamp(powerLevel, 0, 1);
        for (const entry of this.entries) {
            const groupPower = power * THREE.MathUtils.clamp(groups[entry.tube ? 'tubes' : 'bulbs'], 0, 1);
            // Slow, subtle visual modulation, rather than a distracting mains-frequency flash.
            const ripple = 1 - (entry.tube ? 0.04 : 0.01)
                * (1 - Math.cos(this.elapsed * Math.PI * 4 * frequency));
            const level = groupPower * ripple;
            for (const material of entry.materials) {
                if (!material.emissive) continue;
                const intensity = level * (entry.tube ? 2.4 : 3.2);
                material.emissive.copy(material.museumEmission.color);
                material.emissiveIntensity = intensity;
                material.museumEmission.intensity = intensity;
            }
            for (const sprite of entry.sprites) {
                sprite.visible = groupPower > 0.001;
                sprite.material.opacity = level * (entry.tube ? 0.22 : 0.5);
            }
        }
    }

    dispose() {
        for (const entry of this.entries) {
            entry.mesh.material = entry.original;
            entry.materials.forEach(material => material.dispose());
            entry.sprites.forEach(sprite => {
                sprite.removeFromParent();
                sprite.material.dispose();
            });
        }
        this.texture.dispose();
        this.entries = [];
    }
}
