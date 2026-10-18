import * as THREE from 'three';
import gsap from 'gsap';
import ArtisticMagneticField from '../ArtisticMagneticField.js';
import EngineeringMagneticField from '../EngineeringMagneticField.js';
import LoadingScreen from '../../Utils/LoadingScreen.js';

export default class TwoPhaseMotorBehavior {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.loadingScreen = new LoadingScreen();
    }

    initialize() {
        const fieldConfig = this.exhibit.config.field;
        if (!fieldConfig || fieldConfig.profile !== 'rotating-motor') {
            throw new Error('The two-phase motor requires the rotating-motor field profile.');
        }
        this.exhibit.activeFieldSystem = new ArtisticMagneticField(this.exhibit);

        this.setControls();
    }

    setAnimation() {
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.exhibit.model);
        this.animation.setActionTimeScale = (action, target, duration = 0.8, delay = 0) => {
            if (!action) return;

            gsap.to(action, {
                timeScale: target,
                duration,
                delay,
                ease: 'power2.inOut'
            });
        };
        this.animation.actions = {};

        const clips = this.exhibit.resource.animations;

        this.animation.actions.generator = this.animation.mixer.clipAction(clips[0]);
        this.animation.actions.generator.loop = THREE.LoopRepeat;
        this.animation.actions.generator.timeScale = 0;
        this.animation.actions.generator.play();

        this.animation.actions.motor = this.animation.mixer.clipAction(clips[1]);
        this.animation.actions.motor.loop = THREE.LoopRepeat;
        this.animation.actions.motor.timeScale = 0;
        this.animation.actions.motor.play();

        this.animation.setActionTimeScale(this.animation.actions.motor, 1, 5);
        this.animation.setActionTimeScale(this.animation.actions.generator, 1, 3, 1.5);

        this.animation.generator = this.animation.actions.generator;
        this.animation.motor = this.animation.actions.motor;
    }

    setControls() {
        this.controlsFolder = this.exhibit.debug.getControls().addFolder('Генератор');
        this.controlsParams = {
            приказ: 'Уметнички',
            power: true,
            fieldPolarity: 1
        };

        const powerSwitch = document.createElement('li');
        powerSwitch.className = 'magnet-switch on';
        powerSwitch.innerHTML = `
                <span>Систем</span>
                <div class="magnet-switch-track">
                    <div class="magnet-switch-knob"></div>
                </div>
        `;

        this.controlsFolder.__ul.appendChild(powerSwitch);

        powerSwitch.addEventListener('click', () => {
            if (!this.animation) return;

            this.controlsParams.power = !this.controlsParams.power;
            powerSwitch.classList.toggle('on', this.controlsParams.power);

            if (this.controlsParams.power) {
                this.animation.setActionTimeScale(this.animation.motor, 1, 5);
                this.animation.setActionTimeScale(this.animation.generator, this.controlsParams.fieldPolarity, 3, 1.5);
                return;
            }

            this.animation.setActionTimeScale(this.animation.actions.motor, 0, 5);
            this.animation.setActionTimeScale(this.animation.actions.generator, 0, 3, 2);
        });

        this.controlsFolder
            .add(this.controlsParams, 'приказ', ['Уметнички', 'Инжењерски'])
            .name('Приказ')
            .onChange(async (value) => {
                if (value === 'Уметнички') await this.switchField('artistic');
                if (value === 'Инжењерски') await this.switchField('engineering');
            });

        this.controlsFolder
            .add(this.controlsParams, 'fieldPolarity', {
                'Позитиван': 1,
                'Негативан': -1
            })
            .name('Поларитет')
            .onChange((value) => {
                this.controlsParams.fieldPolarity = value;

                if (this.animation?.generator) {
                    this.animation.setActionTimeScale(this.animation.generator, value, 3);
                }
            });

        this.exhibit.addHotspotControls(this.controlsFolder, this.controlsParams);
    }

    async switchField(target = 'artistic') {
        this.loadingScreen.show();

        this.exhibit.activeFieldSystem?.destroy?.();
        this.exhibit.activeFieldSystem = null;
        this.loadingScreen.setProgress(0.1);

        await new Promise((resolve) => setTimeout(resolve, 50));

        this.loadingScreen.setProgress(0.35);

        if (target === 'artistic') {
            this.exhibit.activeFieldSystem = new ArtisticMagneticField(this.exhibit);
        }

        if (target === 'engineering') {
            this.exhibit.activeFieldSystem = new EngineeringMagneticField(this.exhibit);
        }

        this.loadingScreen.setProgress(0.8);
        setTimeout(() => this.loadingScreen.hide(), 1000);
    }

    update() {
        this.animation?.mixer?.update(this.exhibit.time.delta * 0.001);
    }

    dispose() {
        this.animation?.mixer?.stopAllAction();
    }
}
