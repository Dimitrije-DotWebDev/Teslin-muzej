import * as THREE from 'three';
import gsap from 'gsap';
import RotatingMotorBehavior from './RotatingMotorBehavior.js';

const normalize = (name) => name.toLowerCase().trim().replace(/[_.\s]+/g, '-');

export default class SymmetricMotorBehavior extends RotatingMotorBehavior {
    initialize() {
        const field = this.exhibit.config.field;
        if (!field || field.profile !== 'rotating-field' ||
            !field.secondaryReferencePartId || !field.secondaryRotationPartId) {
            throw new Error('A symmetric motor requires two rotating-field sources.');
        }
        super.initialize();
        this.setFieldActive(false);
    }

    setControls() {
        super.setControls();
        this.controlsParams.generatorIndex = 0;
        this.controlsFolder
            .add(this.controlsParams, 'generatorIndex', { 'Мотор 1': 0, 'Мотор 2': 1 })
            .name('Генератор')
            .onChange(() => {
                if (this.animation && this.controlsParams.power) this.startRotorAnimations();
            });
    }

    setAnimation() {
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.exhibit.model);
        this.animation.setActionTimeScale = (action, target, duration = 0.8, delay = 0) => {
            if (!action) return;
            gsap.killTweensOf(action, 'timeScale');
            gsap.to(action, { timeScale: target, duration, delay, ease: 'power2.inOut' });
        };
        // Only explicitly selected clips participate. The GLB also contains a legacy Take 001.
        const findClip = (...names) => this.exhibit.resource.animations.find((clip) =>
            names.includes(normalize(clip.name)));
        this.animation.rotors = [1, 2].map((index) => {
            const clip = findClip(`motor-${index}`);
            if (!clip) throw new Error(`A symmetric motor requires motor-${index}.`);
            return this.animation.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
        });
        this.animation.startups = [1, 2].map((index) => {
            const clip = findClip(`pokretanje-motor-${index}`, `pokretanje-motora-${index}`);
            if (!clip) throw new Error(`A symmetric motor requires pokretanje-motor-${index}.`);
            const action = this.animation.mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            return action;
        });
        this.animation.actions = [...this.animation.rotors, ...this.animation.startups]
            .map((action) => ({ clip: action.getClip(), action }));
        this.onStartupFinished = ({ action }) => {
            if (action !== this.startupAction || !this.controlsParams.power || this.phase !== 'starting') return;
            this.phase = 'generator';
            this.animation.setActionTimeScale(this.animation.generator, 1, 1.5);
            this.fieldStartCall = gsap.delayedCall(1.5, () => {
                this.setFieldActive(true);
                this.phase = 'field';
                this.motorStartCall = gsap.delayedCall(0.75, () => {
                    this.phase = 'running';
                    this.animation.setActionTimeScale(this.animation.motor, this.controlsParams.fieldPolarity, 3);
                });
            });
        };
        this.animation.mixer.addEventListener('finished', this.onStartupFinished);
        if (this.controlsParams.power) this.startRotorAnimations();
    }

    // Startup clips must never be restarted by the generic power-switch handler.
    startAuxiliaryAnimations() {}

    setFieldActive(active) {
        this.exhibit.fieldContext.rotationEnabled = active;
        this.exhibit.fieldContext.root.visible = active;
    }

    startRotorAnimations() {
        this.clearSequence();
        this.animation.actions.forEach(({ action }) => {
            gsap.killTweensOf(action);
            action.stop();
        });
        const index = Number(this.controlsParams.generatorIndex);
        const field = this.exhibit.config.field;
        this.animation.generator = this.animation.rotors[index];
        this.animation.motor = this.animation.rotors[1 - index];
        // Both field placement and angle follow the driven motor, including its
        // acceleration, polarity changes and rotation inherited from an Empty.
        this.exhibit.fieldContext.setSource(
            index === 0 ? field.secondaryReferencePartId : field.referencePartId,
            index === 0 ? field.secondaryRotationPartId : field.rotationPartId
        );
        this.setFieldActive(false);
        this.animation.rotors.forEach((action) => {
            action.reset().setEffectiveTimeScale(0).play();
        });
        this.phase = 'starting';
        this.startupAction = this.animation.startups[index];
        this.startupAction.reset().setEffectiveTimeScale(1).play();
    }

    getPolarityAction() {
        return this.phase === 'running' ? this.animation?.motor : null;
    }

    clearSequence() {
        this.fieldStartCall?.kill();
        this.motorStartCall?.kill();
        this.fieldStartCall = null;
        this.motorStartCall = null;
        this.startupAction = null;
    }

    stopRotorAnimations() {
        this.clearSequence();
        this.phase = 'stopped';
        this.setFieldActive(false);
        this.animation.actions.forEach(({ action }) => {
            gsap.killTweensOf(action);
            action.setEffectiveTimeScale(0);
        });
    }

    dispose() {
        this.clearSequence();
        this.animation?.mixer?.removeEventListener('finished', this.onStartupFinished);
        super.dispose();
    }
}
