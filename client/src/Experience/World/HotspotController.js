import * as THREE from 'three';
import { Hotspot } from './Hotspot';

export default class HotspotController {
    constructor(experience, model) {
        this.experience = experience;
        this.model = model;
        this.canvas = experience.canvas;
        this.hotspots = [];
        this.targets = new Map();
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.container = document.createElement('div');
        this.container.className = 'hotspot-overlay';
        document.body.append(this.container);
        this.events = new AbortController();
        const options = { signal: this.events.signal };
        window.addEventListener('pointermove', event => {
            this.pointerEvent = event.pointerType === 'touch' ? null : event;
        }, options);
        this.canvas.addEventListener('pointermove', event => {
            if (this.press && Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) > 6) this.press.dragged = true;
            this.pointerEvent = event.pointerType === 'touch' ? null : event;
            if (this.suppressed && this.pick(event) !== this.suppressed) this.suppressed = null;
        }, options);
        this.canvas.addEventListener('pointerleave', () => { this.pointerEvent = null; this.hover(null); }, options);
        this.canvas.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0) { if (this.press) this.press.dragged = true; return; }
            this.press = { x: event.clientX, y: event.clientY, id: event.pointerId, dragged: false };
        }, options);
        window.addEventListener('pointerup', event => {
            const press = this.press;
            if (!press || event.pointerId !== press.id) return;
            this.press = null;
            if (press.dragged || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
            const hit = this.pick(event);
            if (hit) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
                this.suppressed = null;
                if (this.active !== hit) this.active?.hide();
                this.active = this.pinned = hit;
                hit.show();
            }
        }, options);
        window.addEventListener('pointercancel', () => { this.press = null; this.pointerEvent = null; }, options);
        window.addEventListener('blur', () => { this.press = null; this.pointerEvent = null; this.hover(null); }, options);
        window.addEventListener('keydown', event => { if (event.key === 'Escape') this.close(); }, options);
    }

    add(config) {
        let hotspot;
        hotspot = new Hotspot({ ...config, container: this.container,
            onClose: () => this.close(),
            onEnter: () => { this.overPanel = hotspot; clearTimeout(this.hideTimer); this.hideTimer = null; },
            onLeave: () => { this.overPanel = null; this.scheduleHide(); }
        });
        this.hotspots.push(hotspot);
        hotspot.targets.forEach(target => this.targets.set(target, hotspot));
        return hotspot;
    }

    pick(event) {
        if (document.elementFromPoint(event.clientX, event.clientY) !== this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.experience.camera.instance);
        let object = this.raycaster.intersectObject(this.model, true)[0]?.object;
        while (object) {
            const hotspot = this.targets.get(object);
            if (hotspot) return hotspot.enabled ? hotspot : null;
            object = object.parent;
        }
        return null;
    }

    hover(hit) {
        this.hovered = hit;
        this.canvas.style.cursor = hit ? 'pointer' : '';
        this.hotspots.forEach(hotspot => hotspot.setHovered(Boolean(this.pinned && hotspot === hit && hotspot !== this.pinned)));
        if (this.pinned || this.overPanel) return;
        if (hit && hit !== this.suppressed) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
            if (this.active !== hit) this.active?.hide();
            this.active = hit;
            hit.show();
        } else this.scheduleHide();
    }

    scheduleHide() {
        if (this.pinned || this.overPanel || this.hideTimer) return;
        this.hideTimer = setTimeout(() => {
            this.active?.hide();
            this.active = null;
            this.hideTimer = null;
        }, 220);
    }

    close() {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        this.suppressed = this.active;
        this.active?.hide();
        this.active = this.pinned = this.overPanel = null;
        this.hotspots.forEach(hotspot => hotspot.setHovered(false));
    }

    setVisible(value) {
        this.close();
        this.hotspots.forEach(hotspot => hotspot.setVisible(value));
    }

    update() {
        this.model.updateWorldMatrix(true, true);
        if (this.pointerEvent && !this.press) this.hover(this.pick(this.pointerEvent));
        const rect = this.canvas.getBoundingClientRect();
        this.hotspots.forEach(hotspot => hotspot.update(this.experience.camera.instance, rect));
    }

    dispose() {
        clearTimeout(this.hideTimer);
        this.events.abort();
        this.canvas.style.cursor = '';
        this.hotspots.forEach(hotspot => hotspot.dispose());
        this.container.remove();
    }
}
