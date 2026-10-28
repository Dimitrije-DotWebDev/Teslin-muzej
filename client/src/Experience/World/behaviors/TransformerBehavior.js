import * as THREE from 'three';
import gsap from 'gsap';
import LoadingScreen from '../../Utils/LoadingScreen.js';
import TransformerArtisticField from '../TransformerArtisticField.js';
import TransformerEngineeringField from '../TransformerEngineeringField.js';
import TransformerLighting from '../TransformerLighting.js';

export default class TransformerBehavior {
    constructor(exhibit) {
        this.exhibit = exhibit;
        this.loadingScreen = new LoadingScreen();
        this.powerLevel = 0;
        this.frequency = 1;
        this.lightLevels = { bulbs: 1, tubes: 1 };
        this.usesRollingSound = false;
    }

    initialize() {
        if (this.exhibit.config.field?.profile !== 'alternating-core') {
            throw new Error('A transformer requires the alternating-core field profile.');
        }
        this.exhibit.activeFieldSystem = new TransformerArtisticField(this.exhibit);
        this.setControls();
        this.lighting = new TransformerLighting(this.exhibit.model);
        gsap.to(this, { powerLevel: 1, duration: 1.2, ease: 'power2.inOut' });
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
        this.animation.mixer.timeScale = this.controlsParams.power ? 1 : 0;
    }

    setPower(enabled) {
        this.controlsParams.power = enabled;
        // Freeze in the current pose; resuming must not reset the generator clip.
        if (this.animation) this.animation.mixer.timeScale = enabled ? 1 : 0;
        gsap.killTweensOf(this, 'powerLevel');
        gsap.to(this, {
            powerLevel: enabled ? 1 : 0,
            duration: 1.2,
            ease: 'power2.inOut'
        });
    }

    setControls() {
        this.controlsFolder = this.exhibit.debug.getControls().addFolder('Трансформатор');
        this.controlsParams = {
            приказ: 'Уметнички',
            power: true,
            frequency: 1,
            bulbs: true,
            tubes: true
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
            this.setPower(!this.controlsParams.power);
            powerSwitch.classList.toggle('on', this.controlsParams.power);
        });

        const lightingFolder = this.controlsFolder.addFolder('Осветљење');
        for (const [key, label] of [['bulbs', 'Сијалице'], ['tubes', 'Светлеће цеви']]) {
            lightingFolder.add(this.controlsParams, key).name(label).onChange(value => {
                gsap.killTweensOf(this.lightLevels, key);
                gsap.to(this.lightLevels, {
                    [key]: value ? 1 : 0,
                    duration: 0.45,
                    ease: 'power2.inOut'
                });
            });
        }
        lightingFolder.open();

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
        if (this.disposed) return;

        this.exhibit.activeFieldSystem = target === 'engineering'
            ? new TransformerEngineeringField(this.exhibit)
            : new TransformerArtisticField(this.exhibit);

        this.loadingScreen.setProgress(0.8);
        setTimeout(() => this.loadingScreen.hide(), 600);
    }

    update() {
        this.animation?.mixer.update(this.exhibit.time.delta * 0.001);
        this.lighting?.update(this.exhibit.time.delta * 0.001, this.powerLevel, this.frequency, this.lightLevels);
    }

    dispose() {
        this.disposed = true;
        gsap.killTweensOf(this);
        gsap.killTweensOf(this.lightLevels);
        this.animation?.mixer.stopAllAction();
        this.lighting?.dispose();
    }
}
