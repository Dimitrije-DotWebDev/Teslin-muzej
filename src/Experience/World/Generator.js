import * as THREE from 'three';
import Experience from '../Experience';
import { Hotspot } from './Hotspot';

export default class Generator{
    constructor(position, key, hotspotPartNames){
        this.Experience = new Experience();
        this.scene = this.Experience.scene;
        this.resources = this.Experience.resources;
        this.time = this.Experience.time;
        this.resource = this.resources.items[key];
        this.position = position;
        this.hotspotPartNames = hotspotPartNames;
        this.debug = this.Experience.debug;
        this.setModel();
        this.setAnimation();
        this.setHotspots();
        this.setDebug();
    }

    setModel(){
        this.model = this.resource.scene;
        this.model.position.copy(this.position);
        this.scene.add(this.model);
        this.model.traverse((child)=>{
            if(child.isMesh){
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
    setHotspots() {
        this.hotspotMeshes = {};
        this.hotspots = [];

        for(const key in this.hotspotPartNames){

            const data = this.hotspotPartNames[key];

            const mesh = this.model.getObjectByName(data.name);

            if(!mesh) continue;
            this.hotspotMeshes[key] = mesh;
            this.model.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();

            box.getSize(size);
            box.getCenter(center);

            const pos = center.clone();

            switch(data.edge){

                case 'left':
                    pos.x -= size.x / 2;
                    break;

                case 'right':
                    pos.x += size.x / 2;
                    break;

                case 'up':
                    pos.y += size.y / 2;
                    break;

                case 'bottom':
                    pos.y -= size.y / 2;
                    break;

            }
            pos.z +=size.z/2;
            if(data.offset){

                pos.x += data.offset.x || 0;
                pos.y += data.offset.y || 0;
                pos.z += data.offset.z || 0;

            }

            const offset = new THREE.Vector3(0.5,0.5,0);

            const hotspot = new Hotspot(
                pos,
                key,
                offset,
                0xff0000,
                0.2
            );

            this.hotspots.push(hotspot);
        }
    }
    setAnimation(){
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.model);

        this.animation.actions = {};
        this.animation.actions.generate = this.animation.mixer.clipAction(this.resource.animations[0]);

        this.animation.actions.current = this.animation.actions.generate;  
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name];
            const oldAction = this.animation.actions.current;
            if(newAction !== oldAction){
                newAction.reset();
                newAction.play();
                newAction.croosFadeFrom(oldAction, 1);
            }
        };
    }
    setDebug(){

        if(!this.debug.active) return;

        this.debugFolder = this.debug.ui.addFolder('Generator Hotspots');

        for(const key in this.hotspotMeshes){

            const mesh = this.hotspotMeshes[key];

            const params = {
                color: `#${mesh.material.emissive.getHexString()}`
            };

            this.debugFolder
                .addColor(params, 'color')
                .name(key)
                .onChange((value)=>{
                    mesh.material.emissive.set(value);
                    mesh.material.emissiveIntensity = 0.15;
                    mesh.material.needsUpdate = true;
                });
        }

    }
    update(){
        this.animation.mixer.update(this.time.delta *0.001);

        if(this.hotspots){
            this.hotspots.forEach(h => h.update());
        }
    }
}