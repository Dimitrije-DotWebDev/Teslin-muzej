import * as THREE from 'three';
import gsap from 'gsap';

export class Hotspot {
    constructor({ id, target, targets = [target], localPosition, title, description, container, onClose, onEnter, onLeave }) {
        this.id = id;
        this.target = target;
        this.targets = [...new Set(targets)];
        this.anchor = localPosition.clone();
        this.projected = new THREE.Vector3();
        this.enabled = true;
        this.progress = { line: 0, panel: 0, glow: 0 };
        this.hoverGlow = { value: 0 };
        this.materials = [];
        const visited = new Set();
        this.targets.forEach(object => object.traverse(child => {
            if (!child.isMesh || visited.has(child)) return;
            visited.add(child);
            const original = child.material;
            const clones = (Array.isArray(original) ? original : [original]).map(material => material.clone());
            child.material = Array.isArray(original) ? clones : clones[0];
            this.materials.push({ child, original, clones, baselines: clones.map(material => ({
                color: material.emissive?.clone(), intensity: material.emissiveIntensity
            })) });
        }));

        const ns = 'http://www.w3.org/2000/svg';
        this.svg = document.createElementNS(ns, 'svg');
        this.svg.classList.add('hotspot-connector');
        this.line = document.createElementNS(ns, 'path');
        this.dot = document.createElementNS(ns, 'circle');
        this.dot.setAttribute('r', '4');
        this.svg.append(this.line, this.dot);
        this.panel = document.createElement('section');
        this.panel.className = 'hotspot-panel';
        this.panel.setAttribute('aria-label', title);
        this.panel.hidden = true;
        const heading = document.createElement('h2');
        heading.textContent = title;
        const body = document.createElement('p');
        body.textContent = description;
        this.close = document.createElement('button');
        this.close.type = 'button';
        this.close.className = 'hotspot-close';
        this.close.textContent = '×';
        this.close.setAttribute('aria-label', 'Затвори објашњење');
        this.close.addEventListener('click', onClose);
        this.panel.addEventListener('pointerenter', onEnter);
        this.panel.addEventListener('pointerleave', onLeave);
        this.panel.append(heading, this.close, body);
        container.append(this.svg, this.panel);
        this.glowColor = new THREE.Color('#5edbff');
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1;
        this.timeline = gsap.timeline({ paused: true })
            .to(this.progress, { line: 1, duration: 0.55 * duration, ease: 'power1.inOut' }, 0)
            .to(this.progress, { glow: 1, duration: 0.77 * duration, ease: 'sine.inOut' }, 0)
            .to(this.progress, { panel: 1, duration: 0.22 * duration, ease: 'power2.out' }, 0.55 * duration);
    }

    show() { if (this.enabled) this.timeline.play(); }
    hide() { this.timeline.reverse(); }
    setHovered(value) {
        if (this.isHovered === value) return;
        this.isHovered = value;
        gsap.to(this.hoverGlow, { value: value ? 0.45 : 0, duration: 0.2, overwrite: true });
    }
    setBaseColor(value) {
        for (const entry of this.materials) for (const baseline of entry.baselines) {
            baseline.color?.set(value);
            baseline.intensity = 0.15;
        }
    }
    setVisible(value) { this.enabled = value; if (!value) this.hide(); }

    update(camera, rect) {
        const { line, panel } = this.progress;
        const glow = Math.max(this.progress.glow, this.hoverGlow.value);
        for (const entry of this.materials) {
            const current = Array.isArray(entry.child.material) ? entry.child.material : [entry.child.material];
            current.forEach((material, index) => {
                if (!material.emissive) return;
                const baseline = material.museumEmission ?? entry.baselines[index];
                material.emissive.copy(baseline.color).lerp(this.glowColor, glow * 0.8);
                material.emissiveIntensity = baseline.intensity + glow * 0.65;
            });
        }
        this.target.localToWorld(this.projected.copy(this.anchor)).project(camera);
        const inView = this.projected.z >= -1 && this.projected.z <= 1 &&
            Math.abs(this.projected.x) <= 1 && Math.abs(this.projected.y) <= 1;
        this.svg.style.visibility = inView && line > 0 ? 'visible' : 'hidden';
        this.panel.hidden = !inView || line <= 0;
        this.panel.style.visibility = panel > 0 ? 'visible' : 'hidden';
        this.panel.inert = panel < 0.95;
        if (!inView || line <= 0) return;
        const x = rect.left + (this.projected.x + 1) * rect.width / 2;
        const y = rect.top + (1 - this.projected.y) * rect.height / 2;
        const width = this.panel.offsetWidth || Math.min(300, window.innerWidth - 24);
        const height = this.panel.offsetHeight || 160;
        const margin = 12;
        const right = x + 60 + width < window.innerWidth - margin;
        const left = THREE.MathUtils.clamp(right ? x + 60 : x - 60 - width, margin, Math.max(margin, window.innerWidth - width - margin));
        const top = THREE.MathUtils.clamp(y - height / 2 - 35, margin, Math.max(margin, window.innerHeight - height - margin));
        const endX = right ? left : left + width;
        const endY = top + Math.min(40, height / 2);
        const elbowX = (x + endX) / 2;
        const firstLength = Math.hypot(elbowX - x, endY - y);
        const secondLength = Math.abs(endX - elbowX);
        const visibleLength = (firstLength + secondLength) * line;
        if (visibleLength <= firstLength) {
            const t = firstLength > 0 ? visibleLength / firstLength : 0;
            this.line.setAttribute('d', `M ${x} ${y} L ${x + (elbowX - x) * t} ${y + (endY - y) * t}`);
        } else {
            const t = secondLength > 0 ? (visibleLength - firstLength) / secondLength : 1;
            this.line.setAttribute('d', `M ${x} ${y} L ${elbowX} ${endY} L ${elbowX + (endX - elbowX) * t} ${endY}`);
        }
        this.dot.setAttribute('cx', x);
        this.dot.setAttribute('cy', y);
        this.svg.style.opacity = String(Math.min(1, line * 5));
        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
        this.panel.style.opacity = String(panel);
        this.panel.style.transform = `translateY(${(1 - panel) * 8}px) scale(${0.97 + panel * 0.03})`;
    }

    dispose() {
        this.timeline.kill();
        gsap.killTweensOf(this.hoverGlow);
        this.svg.remove();
        this.panel.remove();
        for (const { child, original, clones } of this.materials) {
            child.material = original;
            clones.forEach(material => material.dispose());
        }
    }
}
