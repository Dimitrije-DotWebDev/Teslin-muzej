import * as THREE from 'three';
import Experience from "../Experience.js";
import Environment from './Environment.js';
import Generator from './Generator.js';
import Floor from './Floor.js';
import gsap from 'gsap';
import rollingSound from '../../../static/audio/rollingSound/rolling.wav';
import { Hotspot } from './Hotspot.js';

export default class World{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.resources.on('ready', ()=>{
            this.envronment = new Environment();
            this.twoPhasesGenerator = new Generator(new THREE.Vector3(0,1.33,0), 'twoPhasesGeneratorModel', {navojiMotora: {name: 'Tube64',edge: 'right', offset: {x: -0.5, y: 0}}, rotorMotora: {name: 'Tube54',edge: 'up', offset: {x: 0, y: 0}}, statorMotora: {name: 'Tube07',edge: 'up', offset: {x: 0.7, y: 0}}, statorGeneratora: {name: 'Box01',edge: 'up', offset: {x: 0, y: 0}}, rotorGeneratora: {name: 'Tube67',edge: 'right', offset: {x: 0, y: 0}}, provodnik: {name: 'Line03', edge: 'bottom', offset: {x: 0, y: 0}}});

            this.floor = new Floor();
            this.addStartButtonEventListener();
        });
    }
    introAnimation(){
        const t1 = gsap.timeline({
            onComplete: () => {
                this.twoPhasesGenerator.animation.actions.current.play();
                this.rollingAudio = new Audio(rollingSound);
                this.rollingAudio.loop = true;
                this.rollingAudio.play();
                this.envronment.ambientLight.intensity = 1.5;
                this.envronment.sunLight.intensity = 5;
            }
        });
        t1.to(this.envronment.sunLight, {intensity: 0, duration: 0.6})
          .to(this.envronment.sunLight, {intensity: 7, duration: 0.8})
          .to(this.envronment.sunLight, {intensity: 3, duration: 0.3})
          .to(this.envronment.sunLight, {intensity: 5, duration: 0.7});

        t1.to(this.envronment.ambientLight, {intensity: 0, duration: 0.6})
          .to(this.envronment.ambientLight, {intensity: 2, duration: 0.8})
          .to(this.envronment.ambientLight, {intensity: 0.5, duration: 0.3})
          .to(this.envronment.ambientLight, {intensity: 1.5, duration: 0.4}, "0");

        t1.to(this.experience.camera.instance.position, {x: 3, y: 6, z: 12, duration: 3, ease: "power2.inOut"}, "0");
    }

    addStartButtonEventListener(){
        document.getElementById("start-button").addEventListener("click", ()=>{
            this.introAnimation();
            document.getElementById("welcome-screen").style.display = 'none';
        });
    }
    update(){
        this.twoPhasesGenerator?.update();
    }
}