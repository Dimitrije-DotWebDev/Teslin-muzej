import * as THREE from 'three';
import Experience from '../Experience.js';

export default class TransformerArtisticField {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.context = exhibit.fieldContext;
        this.time = new Experience().time;
        this.group = new THREE.Group();
        this.lines = [];
        this.setLines();
        this.setParticles();
        this.context.root.add(this.group);
    }

    setLines() {
        for (let index = 0; index < 7; index++) {
            const inset = index * 0.12;
            const points = this.createLoopPoints(2.6 - inset, 1.8 - inset, index * 0.04 - 0.12);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x35a7ff,
                transparent: true,
                opacity: 0.24,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const line = new THREE.LineLoop(geometry, material);
            this.lines.push(line);
            this.group.add(line);
        }
    }

    setParticles() {
        this.particleCount = 48;
        this.particlePositions = new Float32Array(this.particleCount * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        const material = new THREE.PointsMaterial({
            color: 0x8bd8ff,
            size: 0.09,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.particles = new THREE.Points(geometry, material);
        this.group.add(this.particles);
    }

    createLoopPoints(width, height, z) {
        const points = [];
        const segments = 96;
        for (let index = 0; index < segments; index++) {
            points.push(this.getLoopPosition(index / segments, width, height, z));
        }
        return points;
    }

    getLoopPosition(progress, width = 2.3, height = 1.5, z = 0) {
        const perimeter = 2 * (width + height);
        let distance = ((progress % 1) + 1) % 1 * perimeter;
        if (distance < width) return new THREE.Vector3(-width / 2 + distance, height / 2, z);
        distance -= width;
        if (distance < height) return new THREE.Vector3(width / 2, height / 2 - distance, z);
        distance -= height;
        if (distance < width) return new THREE.Vector3(width / 2 - distance, -height / 2, z);
        distance -= width;
        return new THREE.Vector3(-width / 2, -height / 2 + distance, z);
    }

    update() {
        const behavior = this.exhibit.behavior;
        const elapsed = this.time.elapsed * 0.001;
        const wave = Math.sin(elapsed * Math.PI * 2 * behavior.frequency);
        const strength = Math.abs(wave) * behavior.powerLevel;
        const color = wave >= 0 ? 0x35a7ff : 0xff4d55;

        this.lines.forEach((line, index) => {
            line.material.color.setHex(color);
            line.material.opacity = strength * (0.16 + index * 0.025);
        });

        const direction = wave >= 0 ? 1 : -1;
        for (let index = 0; index < this.particleCount; index++) {
            const progress = index / this.particleCount + elapsed * 0.18 * behavior.frequency * direction;
            const position = this.getLoopPosition(progress);
            const offset = index * 3;
            this.particlePositions[offset] = position.x;
            this.particlePositions[offset + 1] = position.y;
            this.particlePositions[offset + 2] = position.z;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.material.color.setHex(color);
        this.particles.material.opacity = strength * 0.9;
    }

    destroy() {
        this.group.traverse((object) => {
            object.geometry?.dispose();
            object.material?.dispose();
        });
        this.group.removeFromParent();
    }
}
