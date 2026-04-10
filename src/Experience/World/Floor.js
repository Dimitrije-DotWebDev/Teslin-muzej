import * as THREE from 'three';
import Experience from "../Experience.js";

export default class Floor{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.setGeometry();
        this.setMaterial();
        this.setMesh();
    }

    setGeometry(){
        this.geometry = new THREE.CircleGeometry(10,64);
    }

    setMaterial(){
        this.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xf1f1f1),

            roughness: 0.25,
            metalness: 0.0,

            clearcoat: 0.25,
            clearcoatRoughness: 0.4,

            reflectivity: 0.5,
            ior: 1.5,
            opacity: 0.8,
            transparent: true
        });
    }

    setMesh(){
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI/2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
    }
}