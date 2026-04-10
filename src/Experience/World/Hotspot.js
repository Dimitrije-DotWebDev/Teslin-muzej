import * as THREE from 'three';
import Experience from '../Experience';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class Hotspot {
    constructor(position, text, lineOffset, color, size){
        this.Experience = new Experience();
        this.scene = this.Experience.scene;
        this.position = position;
        this.text = text;
        this.lineOffset = lineOffset;
        this.color = color;
        this.size = size;
        this.time = this.Experience.time;
        this.texture = this.Experience.resources.items.hotspotTexture;
        this.setSpot();
        this.setRipple();
        this.setLine();
        this.setTextbox();
    }

    setSpot(){

        this.spotMaterial = new THREE.SpriteMaterial({
            map: this.texture,
            color: this.color,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        this.mesh = new THREE.Sprite(this.spotMaterial);
        this.mesh.position.copy(this.position);
        this.mesh.scale.set(this.size, this.size, this.size);
        this.scene.add(this.mesh);
    }
    setRipple(){

        this.rippleMaterial = new THREE.SpriteMaterial({
            map: this.texture,
            color: this.color,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            depthTest: false
        });

        this.ripple = new THREE.Sprite(this.rippleMaterial);
        this.ripple.position.copy(this.position);

        this.ripple.scale.set(this.size, this.size, this.size);

        this.scene.add(this.ripple);
    }
    setLine(){
        this.points = [
            this.position,
            this.position.clone().add(this.lineOffset)
        ]

        this.lineGeometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.line);
    }

    setTextbox(){
        const div = document.createElement('div');
        div.className = 'hotspot-label';
        div.innerHTML = this.text;

        this.label = new CSS2DObject(div);
        this.label.position.copy(this.position.clone().add(this.lineOffset));
        this.scene.add(this.label);  
    }

    update() {
        const elapsed = this.time.elapsed;

        const min = 1;
        const max = 1.5;
        const speed = 0.005; // sporije pulsiranje

        const pulse = min + ((Math.sin(elapsed * speed) + 1) / 2) * (max - min);

        const scale = this.size * pulse;

        this.mesh.scale.set(scale, scale, scale);

        const rippleSpeed = 0.0015;

        const rippleProgress = (elapsed * rippleSpeed) % 1;

        const rippleScale = this.size * (1 + rippleProgress * 2);

        this.ripple.scale.set(rippleScale, rippleScale, rippleScale);

        this.ripple.material.opacity = 1 - rippleProgress;

        const endPoint = this.position.clone().add(this.lineOffset);

        this.line.geometry.setFromPoints([
            this.position,
            endPoint
        ]);

    }

    dispose() {

        this.scene.remove(this.mesh);
        this.scene.remove(this.line);
        this.scene.remove(this.label);

        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}