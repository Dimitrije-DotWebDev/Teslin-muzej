import * as THREE from 'three';
import gsap from 'gsap';

export default class AutomaticTour {
    constructor(world, { idleMs = 60000, overviewMs = 24000, hotspotMs = 6500,
        catalogMs = 2500, transitionMs = 1600, now = () => performance.now() } = {}) {
        this.world = world;
        this.now = now;
        this.timing = { idleMs, overviewMs, hotspotMs, catalogMs, transitionMs };
        this.lastInteraction = now();
        this.active = false;
        this.epoch = 0;
        this.index = -1;
        this.badge = document.getElementById('automatic-tour-status');
        this.events = new AbortController();
        const options = { capture: true, passive: true, signal: this.events.signal };
        for (const type of ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'scroll']) {
            window.addEventListener(type, () => this.interact(), options);
        }
        window.addEventListener('keydown', event => {
            const editing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
            if (!editing && event.key.toLowerCase() === 'g' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                if (event.repeat) return;
                event.preventDefault();
                this.active ? this.interact() : this.start();
            } else this.interact();
        }, { capture: true, signal: this.events.signal });
        document.addEventListener('visibilitychange', () => this.interact(), { signal: this.events.signal });
        window.addEventListener('popstate', () => this.interact(), { signal: this.events.signal });
    }

    allowed() {
        return !document.hidden && !this.world.adminPanel.isAdminRoute();
    }

    interact() {
        this.lastInteraction = this.now();
        if (this.active) this.stop();
    }

    start() {
        if (this.active || !this.allowed() || this.world.isOpeningExhibit ||
            !this.world.catalog.exhibits.some(exhibit => exhibit.isAvailable)) return;
        this.active = true;
        this.epoch++;
        this.badge.hidden = false;
        const controls = this.world.experience.camera.controls;
        this.savedControls = { autoRotate: controls.autoRotate, autoRotateSpeed: controls.autoRotateSpeed,
            enabled: controls.enabled, enableDamping: controls.enableDamping };
        controls.autoRotate = false;
        controls.enabled = false;
        controls.enableDamping = false;
        controls.update?.();
        if (this.world.activeExhibit) {
            this.index = this.available().findIndex(exhibit => exhibit.id === this.world.activeExhibitId);
            this.stage = 'intro';
            this.deadline = this.now() + 1000;
        } else this.openNext();
    }

    available() {
        return this.world.catalog.exhibits.filter(exhibit => exhibit.isAvailable);
    }

    async openNext() {
        const exhibits = this.available();
        if (!this.active || !exhibits.length) { this.stop(); return; }
        this.index = (this.index + 1) % exhibits.length;
        const exhibit = exhibits[this.index];
        const epoch = this.epoch;
        this.stage = 'loading';
        this.badge.textContent = `Аутоматски обилазак · ${exhibit.title} · G или додир за прекид`;
        const opened = await this.world.openExhibit(exhibit, {
            shouldContinue: () => this.active && this.epoch === epoch && this.allowed()
        });
        if (!this.active || this.epoch !== epoch) return;
        this.stage = opened ? 'intro' : 'catalog';
        this.deadline = this.now() + (opened ? 5000 : this.timing.catalogMs);
    }

    beginOverview() {
        const exhibit = this.world.activeExhibit;
        if (!exhibit) { this.finishExhibit(); return; }
        const camera = this.world.experience.camera;
        const controller = exhibit.hotspotController;
        controller.close();
        controller.automatic = true;
        controller.pointerEvent = null;
        this.hotspots = controller.hotspots.filter(hotspot => hotspot.enabled);
        this.hotspotIndex = 0;
        const box = new THREE.Box3().setFromObject(exhibit.model);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        this.center = sphere.center;
        this.distance = this.framingDistance(sphere.radius, 1);
        // The exported exhibits face model +Z. Use this stable front rather than
        // the arbitrary camera direction at the end of the previous orbit.
        this.frontDirection = new THREE.Vector3(0, 0.22, 1).normalize()
            .applyQuaternion(exhibit.model.getWorldQuaternion(new THREE.Quaternion()));
        this.startOrbit('overview');
    }

    framingDistance(radius, widthFraction) {
        const camera = this.world.experience.camera.instance;
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const limitingAngle = Math.atan(Math.tan(halfFov) * Math.min(1, camera.aspect * widthFraction));
        return Math.max(1.2, radius / Math.sin(limitingAngle) * 1.15);
    }

    startOrbit(phase) {
        this.world.activeExhibit?.hotspotController.close();
        this.orbitPhase = phase;
        this.moveCamera(this.center, this.distance, this.frontDirection);
        this.stage = 'orbit-entry';
        this.deadline = this.now() + this.timing.transitionMs;
    }

    updateOrbit() {
        const progress = THREE.MathUtils.clamp((this.now() - this.orbitStartedAt) / this.timing.overviewMs, 0, 1);
        const azimuth = Math.atan2(this.frontDirection.x, this.frontDirection.z) + progress * Math.PI * 2;
        const elevation = Math.asin(THREE.MathUtils.clamp(this.frontDirection.y, -0.8, 0.8));
        const horizontal = this.distance * Math.cos(elevation);
        const camera = this.world.experience.camera;
        camera.controls.target.copy(this.center);
        camera.instance.position.set(
            this.center.x + Math.sin(azimuth) * horizontal,
            this.center.y + Math.sin(elevation) * this.distance,
            this.center.z + Math.cos(azimuth) * horizontal
        );
        camera.instance.lookAt(this.center);
    }

    moveCamera(target, distance, direction = this.frontDirection) {
        const camera = this.world.experience.camera;
        const position = target.clone().addScaledVector(direction, distance);
        this.cameraTween?.kill();
        this.targetTween?.kill();
        this.cameraTween = gsap.to(camera.instance.position, {
            x: position.x, y: position.y, z: position.z, duration: this.timing.transitionMs / 1000, ease: 'power2.inOut'
        });
        this.targetTween = gsap.to(camera.controls.target, {
            x: target.x, y: target.y, z: target.z, duration: this.timing.transitionMs / 1000, ease: 'power2.inOut'
        });
    }

    hotspotDirection(bounds) {
        const size = bounds.getSize(new THREE.Vector3());
        const axes = ['x', 'y', 'z'].sort((a, b) => size[a] - size[b]);
        if (size[axes[0]] >= size[axes[1]] * 0.45) return this.frontDirection;
        // Flat parts need a face-on view of their broad surface, e.g. the
        // horizontal transformer ring and conductors on the tabletop.
        const axis = axes[0];
        const normal = new THREE.Vector3();
        normal[axis] = axis === 'y' ? 1 : (this.frontDirection[axis] < 0 ? -1 : 1);
        return normal.addScaledVector(this.frontDirection, 0.12).normalize();
    }

    showNextHotspot() {
        const controller = this.world.activeExhibit?.hotspotController;
        const hotspot = this.hotspots[this.hotspotIndex++];
        if (!controller) { this.finishExhibit(); return; }
        if (!hotspot) { this.startOrbit('outro'); return; }
        controller.showAutomatic(hotspot);
        const bounds = new THREE.Box3();
        for (const part of hotspot.targets ?? [hotspot.target]) bounds.union(new THREE.Box3().setFromObject(part));
        const sphere = bounds.getBoundingSphere(new THREE.Sphere());
        const direction = this.hotspotDirection(bounds);
        const distance = this.framingDistance(sphere.radius, 0.65);
        const camera = this.world.experience.camera.instance;
        const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
        const panelSpace = distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 0.25;
        const target = sphere.center.clone().addScaledVector(right, panelSpace);
        // Keep the front view stationary throughout the explanation. Frame the
        // highlighted geometry itself, not just its label's anchor point.
        this.moveCamera(target, distance, direction);
        this.stage = 'hotspot';
        this.deadline = this.now() + this.timing.hotspotMs;
    }

    finishExhibit() {
        this.cameraTween?.kill();
        this.targetTween?.kill();
        this.world.experience.camera.controls.autoRotate = false;
        this.world.returnToCatalog({ focus: false });
        this.stage = 'catalog';
        this.deadline = this.now() + this.timing.catalogMs;
    }

    stop() {
        this.active = false;
        this.epoch++;
        this.cameraTween?.kill();
        this.targetTween?.kill();
        // The intro may still be moving the camera when the visitor takes over.
        gsap.killTweensOf(this.world.experience.camera.instance.position);
        const controls = this.world.experience.camera.controls;
        if (this.savedControls) Object.assign(controls, this.savedControls);
        const controller = this.world.activeExhibit?.hotspotController;
        if (controller) { controller.automatic = false; controller.close(); controller.pointerEvent = null; }
        this.badge.hidden = true;
        this.lastInteraction = this.now();
    }

    update() {
        if (!this.allowed()) { this.interact(); return; }
        if (!this.active) {
            if (this.now() - this.lastInteraction >= this.timing.idleMs) this.start();
            return;
        }
        if (this.stage === 'overview' || this.stage === 'outro') {
            this.updateOrbit();
            if (this.now() >= this.deadline) {
                if (this.stage === 'overview') this.showNextHotspot();
                else this.finishExhibit();
            }
            return;
        }
        if (this.stage === 'loading' || this.now() < this.deadline) return;
        if (this.stage === 'catalog') this.openNext();
        else if (this.stage === 'intro') this.beginOverview();
        else if (this.stage === 'orbit-entry') {
            this.stage = this.orbitPhase;
            this.orbitStartedAt = this.now();
            this.deadline = this.now() + this.timing.overviewMs;
            this.updateOrbit();
        }
        else this.showNextHotspot();
    }

    dispose() {
        this.stop();
        this.events.abort();
    }
}
