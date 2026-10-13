import twoPhaseMotor from '../config/twoPhaseMotor';
import * as THREE from 'three';
import Experience from "../Experience.js";
import Environment from './Environment.js';
import Generator from './Generator.js';
import Floor from './Floor.js';
import gsap from 'gsap';
import rollingSound from '../../../static/audio/rollingSound/rolling.wav';

export default class World{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.resources.on('ready', ()=>{
            this.displayStartButton();
            this.envronment = new Environment();
            this.twoPhasesGenerator = new Generator(
                new THREE.Vector3(0,1.33,0),
                'twoPhasesGeneratorModel',
                twoPhaseMotor);

            this.floor = new Floor();
            this.addStartButtonEventListener();
        });
    }
    displayStartButton(){
        const startButton = document.getElementById("start-button");
        startButton.classList.remove("display-none");
    }
    introAnimation(){
        const t1 = gsap.timeline({
            onComplete: () => {
                setTimeout(() => {
                    this.twoPhasesGenerator.setAnimation();
                    this.rollingAudio = new Audio(rollingSound);
                    this.rollingAudio.loop = true;
                    this.rollingAudio.play();
                }, 1000);
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

        t1.to(this.experience.camera.instance.position, {x: -1, y: 3, z: 13, duration: 3, ease: "power2.inOut"}, "0");
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