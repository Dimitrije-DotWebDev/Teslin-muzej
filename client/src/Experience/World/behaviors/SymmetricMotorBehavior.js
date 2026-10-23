import * as THREE from 'three';
import gsap from 'gsap';
import RotatingMotorBehavior from './RotatingMotorBehavior.js';

export default class SymmetricMotorBehavior extends RotatingMotorBehavior {
    initialize() {
        const field = this.exhibit.config.field;
        if (!field || field.profile !== 'rotating-field' ||
            !field.secondaryReferencePartId || !field.secondaryRotationPartId) {
            throw new Error('A symmetric motor requires two rotating-field sources.');
        }
        super.initialize();
    }

    setAnimation() {
        this.animation = {};
        this.animation.mixer = new THREE.AnimationMixer(this.exhibit.model);
        this.animation.setActionTimeScale = (action, target, duration = 0.8, delay = 0) => {
            if (!action) return;
            gsap.killTweensOf(action, 'timeScale');
            gsap.to(action, { timeScale: target, duration, delay, ease: 'power2.inOut' });
        };
        this.animation.actions = this.exhibit.resource.animations.map((clip) => {
            const action = this.animation.mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            action.timeScale = 0;
            action.play();
            return { clip, action };
        });

        const normalize = (name) => name.toLowerCase().replace(/[_.\s]+/g, '-');
        this.animation.motorOne = this.animation.actions.find(({ clip }) =>
            normalize(clip.name).includes('motor-1'))?.action;
        this.animation.motorTwo = this.animation.actions.find(({ clip }) =>
            normalize(clip.name).includes('motor-2'))?.action;

        if (!this.animation.motorOne || !this.animation.motorTwo) {
            throw new Error('A symmetric motor requires motor-1 and motor-2 animations.');
        }

        this.animation.actions.forEach(({ action }) => {
            if (action === this.animation.motorOne || action === this.animation.motorTwo) return;
            this.animation.setActionTimeScale(action, 1, 3);
        });
        this.startRotorAnimations();
    }

    startRotorAnimations() {
        this.clearCycle();
        this.activeGeneratorIndex = 0;
        this.activateRoles(true);
    }

    activateRoles(initial = false) {
        const firstIsGenerator = this.activeGeneratorIndex === 0;
        const generator = firstIsGenerator ? this.animation.motorOne : this.animation.motorTwo;
        const motor = firstIsGenerator ? this.animation.motorTwo : this.animation.motorOne;
        const field = this.exhibit.config.field;

        this.animation.generator = generator;
        this.animation.motor = motor;
        this.exhibit.fieldContext.setSource(
            firstIsGenerator ? field.referencePartId : field.secondaryReferencePartId,
            firstIsGenerator ? field.rotationPartId : field.secondaryRotationPartId
        );

        if (!initial) this.animation.setActionTimeScale(motor, 0, 1);
        this.animation.setActionTimeScale(generator, 1, initial ? 3 : 1.5);
        this.motorStartCall = gsap.delayedCall(1.5, () => {
            if (!this.controlsParams.power) return;
            this.animation.setActionTimeScale(motor, this.controlsParams.fieldPolarity, 3);
        });
        this.cycleCall = gsap.delayedCall(10, () => {
            if (!this.controlsParams.power) return;
            this.activeGeneratorIndex = this.activeGeneratorIndex === 0 ? 1 : 0;
            this.activateRoles();
        });
    }

    clearCycle() {
        this.motorStartCall?.kill();
        this.cycleCall?.kill();
        this.motorStartCall = null;
        this.cycleCall = null;
    }

    stopRotorAnimations() {
        this.clearCycle();
        super.stopRotorAnimations();
    }

    dispose() {
        this.clearCycle();
        super.dispose();
    }
}
