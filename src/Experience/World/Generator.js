import * as THREE from 'three';
import Experience from '../Experience';
import { Hotspot } from './Hotspot';
import ArtisticMagneticField from './ArtisticMagneticField';
import EngineeringMagneticField from './EngineeringMagneticField';
import LoadingScreen from '../Utils/LoadingScreen';
import gsap from 'gsap';

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
        //this.setAnimation();
        this.setHotspots();
        this.activeFieldSystem = null;
        this.magneticField = new ArtisticMagneticField(this);
        this.activeFieldSystem = this.magneticField;
        this.LoadingScreen = new LoadingScreen();
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
            if(this.hotspotPartNames[key].isMagneticFieldObject){
                this.magneticFieldObject = mesh;
            }
            if(this.hotspotPartNames[key].isMagneticFieldRotationObject){
                this.magneticFieldRotationObject = mesh;
            }
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
                this.hotspotPartNames[key].displayName || key,
                offset,
                0xff0000,
                0.2
            );

            this.hotspots.push(hotspot);
        }
    }
    setAnimation() {
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.model);
        this.animation.setActionTimeScale = (action, target, duration = 0.8, delay = 0) => {

            if (!action) return;

            gsap.to(action, {
                timeScale: target,
                duration: duration,
                delay: delay,
                ease: "power2.inOut"
            });
        };
        this.animation.actions = {};

        // CLIPS
        const clips = this.resource.animations;

        // 1. Generator (index 0)
        this.animation.actions.generator = this.animation.mixer.clipAction(clips[0]);
        this.animation.actions.generator.loop = THREE.LoopRepeat;
        this.animation.actions.generator.timeScale = 0;
        this.animation.actions.generator.play();

        // 2. Motor (index 1)
        this.animation.actions.motor = this.animation.mixer.clipAction(clips[1]);
        this.animation.actions.motor.loop = THREE.LoopRepeat;
        this.animation.actions.motor.timeScale = 0;
        this.animation.actions.motor.play();
        // start both
        
        
        this.animation.setActionTimeScale(this.animation.actions.motor, 1, 5);
        this.animation.setActionTimeScale(this.animation.actions.generator, 1, 3, 1.5);

        // default references
        this.animation.generator = this.animation.actions.generator;
        this.animation.motor = this.animation.actions.motor;
    }
    setDebug() {

        if (!this.debug.active) return;

        this.debugFolder = this.debug.ui.addFolder('Генератор');

        // =========================
        // Generator on/off toggle
        // =========================
        this.debugParams = {
            приказ: 'Уметнички'
        };
        this.debugParams.power = true;

        const container = this.debugFolder.domElement;

        const el = document.createElement('li');
        el.className = 'magnet-switch on';

        el.innerHTML = `
                <span>Систем</span>
                <div class="magnet-switch-track">
                    <div class="magnet-switch-knob"></div>
                </div>
        `;

        this.debugFolder.__ul.appendChild(el);

        el.addEventListener('click', () => {

            this.debugParams.power = !this.debugParams.power;

            el.classList.toggle('on', this.debugParams.power);

            if (this.debugParams.power) {

                // ▶ START
                this.animation.setActionTimeScale(this.animation.motor, 1, 5);
                this.animation.setActionTimeScale(this.animation.generator, this.debugParams.fieldPolarity,3,1.5);

            } else {

                // ⛔ STOP
                this.animation.setActionTimeScale(this.animation.actions.motor, 0, 5);
                this.animation.setActionTimeScale(this.animation.actions.generator, 0, 3, 2);
            }
        });

        // =========================
        // 🎛 SCENE SWITCH TOGGLE
        // =========================

        this.debugFolder
            .add(this.debugParams, 'приказ', ['Уметнички', 'Инжењерски'])
            .name('Приказ')
            .onChange(async (value) => {

                if (value === 'Уметнички') {
                    await this.switchScene('artistic');
                }

                if (value === 'Инжењерски') {
                    await this.switchScene('engineering');
                }
            });

        


        // =========================
        // 🧲 FIELD POLARITY TOGGLE
        // =========================

        this.debugParams.fieldPolarity = 1; // 1 = normal, -1 = inverted

        this.debugFolder
            .add(this.debugParams, 'fieldPolarity', {
                'Позитиван': 1,
                'Негативан': -1
            })
            .name('Поларитет')
            .onChange((value) => {

                this.debugParams.fieldPolarity = value;

                // 🔁 samo generator menja smer
                if (this.animation?.generator) {
                    this.animation.setActionTimeScale(this.animation.actions.generator, value, 3);
                }
            });

        // =========================
        // 🎨 HOTSPOT COLORS
        // =========================
        this.debugParams.hotspotsVisible = true;
        
        const hotspotFolder = this.debugFolder.addFolder('Тачке интеракције');
        
        hotspotFolder.add(this.debugParams, 'hotspotsVisible')
            .name('Видљиве')
            .onChange((value) => {

                if (!this.hotspots) return;

                this.hotspots.forEach(h => {
                    h.setVisible(value);
                });
            });
        for (const key in this.hotspotMeshes) {

            const mesh = this.hotspotMeshes[key];
            const params = {
                color: `#${mesh.material.emissive.getHexString()}`
            };

            hotspotFolder
                .addColor(params, 'color')
                .name(this.hotspotPartNames[key].displayName || key)
                .onChange((value) => {

                    mesh.material.emissive.set(value);
                    mesh.material.emissiveIntensity = 0.15;
                    mesh.material.needsUpdate = true;
                });
        }
    }
    async switchScene(target = "artistic") {

        this.LoadingScreen.show();

        // 1. CLEAN CURRENT
        if (this.activeFieldSystem?.destroy) {
            this.activeFieldSystem.destroy();
            this.activeFieldSystem = null;
        }
        this.LoadingScreen.setProgress(0.1);

        // 2. small GPU sync delay (bitno!)
        await new Promise(r => setTimeout(r, 50));
        
        this.LoadingScreen.setProgress(0.35)
        // 3. CREATE NEW SYSTEM
        if (target === "artistic") {
            this.magneticField = new ArtisticMagneticField(this);
            this.activeFieldSystem = this.magneticField;
        }
        
        if (target === "engineering") {
            this.engineeringField = new EngineeringMagneticField(this);
            this.activeFieldSystem = this.engineeringField;
        }

        this.LoadingScreen.setProgress(0.8);
        
        
        setTimeout(() => {
            this.LoadingScreen.hide();
        }, 1000);
    }
    update(){
        this.animation?.mixer?.update(this.time.delta *0.001);

        if(this.hotspots){
            this.hotspots.forEach(h => h.update());
        }

        this.activeFieldSystem?.update();
    }
}