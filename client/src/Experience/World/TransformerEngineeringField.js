import * as THREE from 'three';
import Experience from '../Experience.js';

export default class TransformerEngineeringField {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.context = exhibit.fieldContext;
        this.time = new Experience().time;
        this.group = new THREE.Group();
        this.arrows = [];
        this.setCorePath();
        this.setCoils();
        this.context.root.add(this.group);
    }

    setCorePath() {
        const points = [
            [-1.15, 0.75, 1, 0, 0],
            [0, 0.75, 1, 0, 0],
            [1.15, 0.75, 0, -1, 0],
            [1.15, 0, 0, -1, 0],
            [1.15, -0.75, -1, 0, 0],
            [0, -0.75, -1, 0, 0],
            [-1.15, -0.75, 0, 1, 0],
            [-1.15, 0, 0, 1, 0]
        ];
        points.forEach(([x, y, dx, dy, dz]) => {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(dx, dy, dz),
                new THREE.Vector3(x, y, 0),
                0.55,
                0x35a7ff,
                0.16,
                0.1
            );
            this.arrows.push({ arrow, direction: new THREE.Vector3(dx, dy, dz) });
            this.group.add(arrow);
        });
    }

    setCoils() {
        this.primary = this.createCoil(0xffa43a, -1.35);
        this.secondary = this.createCoil(0x58d68d, 1.35);
        this.group.add(this.primary, this.secondary);
    }

    createCoil(color, x) {
        const group = new THREE.Group();
        for (let index = 0; index < 8; index++) {
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.25,
                metalness: 0.35,
                roughness: 0.35
            });
            const turn = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), material);
            turn.rotation.y = Math.PI / 2;
            turn.position.set(x, 0, (index - 3.5) * 0.1);
            group.add(turn);
        }
        return group;
    }

    update() {
        const behavior = this.exhibit.behavior;
        const elapsed = this.time.elapsed * 0.001;
        const wave = Math.sin(elapsed * Math.PI * 2 * behavior.frequency);
        const strength = Math.abs(wave) * behavior.powerLevel;
        const direction = wave >= 0 ? 1 : -1;
        const color = wave >= 0 ? 0x35a7ff : 0xff4d55;

        this.arrows.forEach(({ arrow, direction: baseDirection }) => {
            arrow.setDirection(baseDirection.clone().multiplyScalar(direction));
            arrow.setColor(color);
            arrow.line.material.opacity = 0.25 + strength * 0.75;
            arrow.line.material.transparent = true;
            arrow.cone.material.opacity = 0.25 + strength * 0.75;
            arrow.cone.material.transparent = true;
        });
        this.primary.children.forEach((turn) => {
            turn.material.emissiveIntensity = 0.2 + strength * 1.8;
        });
        this.secondary.children.forEach((turn) => {
            turn.material.emissiveIntensity = 0.15 + strength * 1.15;
        });
    }

    destroy() {
        this.group.traverse((object) => {
            object.geometry?.dispose();
            object.material?.dispose();
        });
        this.group.removeFromParent();
    }
}
