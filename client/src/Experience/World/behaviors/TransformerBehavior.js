import * as THREE from 'three';
import gsap from 'gsap';
import LoadingScreen from '../../Utils/LoadingScreen.js';
import TransformerArtisticField from '../TransformerArtisticField.js';
import TransformerEngineeringField from '../TransformerEngineeringField.js';

export default class TransformerBehavior {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.loadingScreen = new LoadingScreen();
        this.powerLevel = 1;
        this.frequency = 1;
        this.usesRollingSound = false;
    }

    initialize() {
        if (this.exhibit.config.field?.profile !== 'alternating-core') {
            throw new Error('A transformer requires the alternating-core field profile.');
        }
        this.exhibit.activeFieldSystem = new TransformerArtisticField(this.exhibit);
        this.setControls();
    }

    setAnimation() {
        this.animation = {
            mixer: new THREE.AnimationMixer(this.exhibit.model),
            actions: []
        };
        this.animation.actions = this.exhibit.resource.animations.map((clip) => {
            const action = this.animation.mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            action.play();
            return action;
        });
    }

    setControls() {
        this.controlsFolder = this.exhibit.debug.getControls().addFolder('Трансформатор');
        this.controlsParams = {
            приказ: 'Уметнички',
            power: true,
            frequency: 1
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
            this.controlsParams.power = !this.controlsParams.power;
            powerSwitch.classList.toggle('on', this.controlsParams.power);
            gsap.killTweensOf(this, 'powerLevel');
            gsap.to(this, {
                powerLevel: this.controlsParams.power ? 1 : 0,
                duration: 1.2,
                ease: 'power2.inOut'
            });
        });

        this.controlsFolder
            .add(this.controlsParams, 'приказ', ['Уметнички', 'Инжењерски'])
            .name('Приказ')
            .onChange(async (value) => {
                if (value === 'Уметнички') await this.switchField('artistic');
                if (value === 'Инжењерски') await this.switchField('engineering');
            });

        this.controlsFolder
            .add(this.controlsParams, 'frequency')
            .name('Фреквенција')
            .min(0.1)
            .max(3)
            .step(0.1)
            .onChange((value) => {
                this.frequency = value;
            });

        this.exhibit.addHotspotControls(this.controlsFolder, this.controlsParams);
    }

    async switchField(target) {
        this.loadingScreen.show();
        this.exhibit.activeFieldSystem?.destroy();
        this.exhibit.activeFieldSystem = null;
        this.loadingScreen.setProgress(0.35);
        await new Promise((resolve) => setTimeout(resolve, 50));

        this.exhibit.activeFieldSystem = target === 'engineering'
            ? new TransformerEngineeringField(this.exhibit)
            : new TransformerArtisticField(this.exhibit);

        this.loadingScreen.setProgress(0.8);
        setTimeout(() => this.loadingScreen.hide(), 600);
    }

    update() {
        this.animation?.mixer.update(this.exhibit.time.delta * 0.001);
    }

    dispose() {
        gsap.killTweensOf(this);
        this.animation?.mixer.stopAllAction();
    }
}
