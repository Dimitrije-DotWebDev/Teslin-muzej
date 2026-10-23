import * as THREE from 'three';
import gsap from 'gsap';
import ArtisticMagneticField from '../ArtisticMagneticField.js';
import EngineeringMagneticField from '../EngineeringMagneticField.js';
import LoadingScreen from '../../Utils/LoadingScreen.js';

export default class RotatingMotorBehavior {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.loadingScreen = new LoadingScreen();
        this.usesRollingSound = true;
    }

    initialize() {
        const fieldConfig = this.exhibit.config.field;
        if (!fieldConfig || fieldConfig.profile !== 'rotating-field') {
            throw new Error('A rotating motor requires the rotating-field profile.');
        }
        this.exhibit.activeFieldSystem = new ArtisticMagneticField(this.exhibit);

        this.setControls();
    }

    setAnimation() {
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.exhibit.model);
        this.animation.setActionTimeScale = (action, target, duration = 0.8, delay = 0) => {
            if (!action) return;

            gsap.killTweensOf(action, 'timeScale');
            gsap.to(action, {
                timeScale: target,
                duration,
                delay,
                ease: 'power2.inOut'
            });
        };
        const clips = this.exhibit.resource.animations;
        this.animation.actions = clips.map((clip) => {
            const action = this.animation.mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            action.timeScale = 0;
            action.play();
            return { clip, action };
        });

        const motorNamedEntry = this.animation.actions.find(({ clip }) =>
            clip.name.toLowerCase().includes('motor'));
        const generatorNamedEntry = this.animation.actions.find(({ clip }) =>
            clip.name.toLowerCase().includes('generator'));

        this.animation.motor = motorNamedEntry?.action
            ?? (generatorNamedEntry ? null : this.animation.actions[0]?.action)
            ?? null;
        this.animation.generator = generatorNamedEntry?.action ?? null;

        this.animation.actions.forEach(({ action }) => {
            if (action === this.animation.generator || action === this.animation.motor) return;
            this.animation.setActionTimeScale(action, 1, 3);
        });
        this.startRotorAnimations();
    }

    startRotorAnimations() {
        const motorDelay = this.animation.generator ? 1.5 : 0;

        this.animation.setActionTimeScale(
            this.animation.generator,
            1,
            5
        );
        this.animation.setActionTimeScale(
            this.animation.motor,
            this.controlsParams.fieldPolarity,
            3,
            motorDelay
        );
    }

    stopRotorAnimations() {
        this.animation.actions.forEach(({ action }) =>
            this.animation.setActionTimeScale(action, 0, 3, 2));
    }

    getPolarityAction() {
        return this.animation?.motor;
    }

    setControls() {
        this.controlsFolder = this.exhibit.debug.getControls().addFolder('Мотор');
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
                this.animation.actions.forEach(({ action }) => {
                    if (action === this.animation.generator || action === this.animation.motor) return;
                    this.animation.setActionTimeScale(action, 1, 3);
                });
                this.startRotorAnimations();
                return;
            }

            this.stopRotorAnimations();
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

                const action = this.getPolarityAction();
                if (this.controlsParams.power && action) {
                    this.animation.setActionTimeScale(action, value, 3);
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
        this.animation?.actions?.forEach(({ action }) => gsap.killTweensOf(action));
        this.animation?.mixer?.stopAllAction();
    }
}
