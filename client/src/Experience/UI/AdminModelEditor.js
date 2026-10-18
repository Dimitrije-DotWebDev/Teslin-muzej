import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default class AdminModelEditor {
    constructor(root, loadModel, getModelPath, onAnchorChange, onTargetsChange) {
        this.root = root;
        this.loadModel = loadModel;
        this.getModelPath = getModelPath;
        this.onAnchorChange = onAnchorChange;
        this.onTargetsChange = onTargetsChange;
        this.canvas = root.querySelector('.admin-model-canvas');
        this.viewport = root.querySelector('.admin-model-viewport');
        this.hint = root.querySelector('.admin-model-hint');
        this.status = root.querySelector('.admin-model-status');
        this.anchorButton = root.querySelector('.admin-pick-anchor');
        this.targetsButton = root.querySelector('.admin-pick-targets');
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.parts = new Map();
        this.targetPartIds = new Set();
        this.materialStates = new Map();
        this.mode = 'navigate';
        this.setScene();
        this.bindEvents();
    }

    setScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050b12);
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.scene.add(new THREE.HemisphereLight(0xbdeeff, 0x17202b, 2.4));
        const light = new THREE.DirectionalLight(0xffffff, 3.2);
        light.position.set(4, 7, 5);
        this.scene.add(light);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewport);
    }

    bindEvents() {
        this.root.querySelector('.admin-model-reload')
            .addEventListener('click', () => this.load(this.getModelPath(), this.getSelection()));
        this.anchorButton.addEventListener('click', () => this.setMode(
            this.mode === 'anchor' ? 'navigate' : 'anchor'
        ));
        this.targetsButton.addEventListener('click', () => this.setMode(
            this.mode === 'targets' ? 'navigate' : 'targets'
        ));
        this.root.querySelector('.admin-clear-targets').addEventListener('click', () => {
            this.targetPartIds.clear();
            this.refreshHighlights();
            this.onTargetsChange([]);
        });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            this.press = { x: event.clientX, y: event.clientY };
        });
        this.canvas.addEventListener('pointerup', (event) => {
            if (!this.press || event.button !== 0) return;
            const distance = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y);
            this.press = null;
            if (distance > 5 || this.mode === 'navigate') return;
            this.pick(event);
        });
        this.canvas.addEventListener('pointerleave', () => {
            this.press = null;
        });
    }

    async open(selection) {
        this.active = true;
        this.root.hidden = false;
        this.resize();
        this.startRendering();
        await this.load(this.getModelPath(), selection);
    }

    close() {
        this.active = false;
        this.root.hidden = true;
        this.setMode('navigate');
        cancelAnimationFrame(this.animationFrame);
    }

    async load(path, selection = this.getSelection()) {
        if (!path) {
            this.setStatus('Експонат нема унету путању до GLB модела.', true);
            this.hint.hidden = false;
            return;
        }

        if (this.model && this.loadedPath === path) {
            this.applySelection(selection);
            this.setStatus('Модел је спреман за избор делова.');
            return;
        }

        const requestId = Symbol();
        this.requestId = requestId;
        this.setStatus('Учитавање 3D модела…');
        this.hint.hidden = false;

        try {
            const resource = await this.loadModel(path);
            if (this.requestId !== requestId) return;
            this.setModel(resource.scene.clone(true));
            this.loadedPath = path;
            this.applySelection(selection);
            this.hint.hidden = true;
            this.setStatus(`Модел је учитан. Пронађено делова: ${this.parts.size}.`);
        } catch (error) {
            if (this.requestId !== requestId) return;
            this.clearModel();
            const message = error.message?.startsWith('Duplicate museumPartId:')
                ? error.message
                : 'Модел није могуће учитати са унете путање.';
            this.setStatus(message, true);
            this.hint.hidden = false;
        }
    }

    setModel(model) {
        this.clearModel();
        this.model = model;
        this.pickableMeshes = [];
        this.parts.clear();
        this.materialStates.clear();

        model.traverse((object) => {
            const partId = object.userData?.museumPartId;
            if (typeof partId === 'string' && partId.trim()) {
                const normalizedPartId = partId.trim();
                if (this.parts.has(normalizedPartId)) {
                    throw new Error(`Duplicate museumPartId: ${normalizedPartId}`);
                }
                this.parts.set(normalizedPartId, object);
            }
            if (!object.isMesh) return;

            this.pickableMeshes.push(object);
            if (Array.isArray(object.material)) {
                object.material = object.material.map((material) => material.clone());
                object.material.forEach((material) => this.rememberMaterial(material));
            } else if (object.material) {
                object.material = object.material.clone();
                this.rememberMaterial(object.material);
            }
        });

        this.scene.add(model);
        model.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) || 1;
        this.modelRadius = radius;
        this.camera.near = Math.max(radius / 10000, 0.001);
        this.camera.far = radius * 100;
        this.camera.position.copy(center).add(new THREE.Vector3(radius * 1.1, radius * .65, radius * 1.1));
        this.camera.updateProjectionMatrix();
        this.controls.target.copy(center);
        this.controls.minDistance = radius * .08;
        this.controls.maxDistance = radius * 8;
        this.controls.update();
    }

    rememberMaterial(material) {
        this.materialStates.set(material, {
            color: material.color?.clone(),
            emissive: material.emissive?.clone(),
            emissiveIntensity: material.emissiveIntensity
        });
    }

    applySelection(selection = {}) {
        this.anchorPartId = selection.anchorPartId || null;
        this.anchorPosition = selection.localPosition
            ? new THREE.Vector3(selection.localPosition.x, selection.localPosition.y, selection.localPosition.z)
            : null;
        this.targetPartIds = new Set(selection.targetPartIds || []);
        this.refreshHighlights();
    }

    getSelection() {
        return {
            anchorPartId: this.anchorPartId,
            localPosition: this.anchorPosition && {
                x: this.anchorPosition.x,
                y: this.anchorPosition.y,
                z: this.anchorPosition.z
            },
            targetPartIds: [...this.targetPartIds]
        };
    }

    setMode(mode) {
        this.mode = mode;
        this.anchorButton.classList.toggle('is-active', mode === 'anchor');
        this.targetsButton.classList.toggle('is-active', mode === 'targets');
        this.canvas.classList.toggle('is-picking', mode !== 'navigate');
        if (mode === 'anchor') this.setStatus('Кликните на место на моделу за anchor тачку.');
        if (mode === 'targets') this.setStatus('Кликните на делове модела да укључите или искључите glow.');
        if (mode === 'navigate' && this.model) this.setStatus('Модел је спреман за избор делова.');
    }

    pick(event) {
        if (!this.model) return;

        const rect = this.canvas.getBoundingClientRect();
        this.pointer.set(
            (event.clientX - rect.left) / rect.width * 2 - 1,
            -(event.clientY - rect.top) / rect.height * 2 + 1
        );
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.pickableMeshes, false)[0];
        if (!hit) return;

        const part = this.findPart(hit.object);
        if (!part) {
            this.setStatus('Изабрани део нема museumPartId.', true);
            return;
        }

        const partId = part.userData.museumPartId.trim();
        if (this.mode === 'anchor') {
            const localPosition = part.worldToLocal(hit.point.clone());
            this.anchorPartId = partId;
            this.anchorPosition = localPosition;
            this.onAnchorChange(partId, localPosition);
            this.refreshHighlights();
            this.setMode('navigate');
            return;
        }

        if (this.targetPartIds.has(partId)) {
            this.targetPartIds.delete(partId);
        } else {
            this.targetPartIds.add(partId);
        }
        this.onTargetsChange([...this.targetPartIds]);
        this.refreshHighlights();
    }

    findPart(object) {
        let current = object;
        while (current && current !== this.scene) {
            if (typeof current.userData?.museumPartId === 'string' &&
                current.userData.museumPartId.trim()) return current;
            current = current.parent;
        }
        return null;
    }

    refreshHighlights() {
        this.clearHelpers();
        this.materialStates.forEach((state, material) => {
            if (state.color && material.color) material.color.copy(state.color);
            if (state.emissive && material.emissive) material.emissive.copy(state.emissive);
            if (state.emissiveIntensity !== undefined) material.emissiveIntensity = state.emissiveIntensity;
        });

        this.targetPartIds.forEach((partId) => {
            const part = this.parts.get(partId);
            if (part) this.highlightPart(part, 0x35d9ff, 1.4);
        });

        const anchorPart = this.parts.get(this.anchorPartId);
        if (anchorPart) {
            this.highlightPart(anchorPart, 0xff9a55, 1.8);
            this.addAnchorMarker(anchorPart);
        }
    }

    highlightPart(part, color, intensity) {
        const highlightColor = new THREE.Color(color);
        part.traverse((object) => {
            if (!object.isMesh || !object.material) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
                if (material.emissive) {
                    material.emissive.copy(highlightColor);
                    material.emissiveIntensity = intensity;
                } else if (material.color) {
                    material.color.lerp(highlightColor, .55);
                }
            });
        });

        const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(part), color);
        this.helpers ??= [];
        this.helpers.push(helper);
        this.scene.add(helper);
    }

    addAnchorMarker(part) {
        if (!this.anchorPosition) return;
        const geometry = new THREE.SphereGeometry(this.modelRadius * .012, 16, 12);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd2ad, depthTest: false });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(part.localToWorld(this.anchorPosition.clone()));
        marker.renderOrder = 10;
        this.anchorMarker = marker;
        this.scene.add(marker);
    }

    clearHelpers() {
        (this.helpers || []).forEach((helper) => {
            this.scene.remove(helper);
            helper.geometry.dispose();
            helper.material.dispose();
        });
        this.helpers = [];

        if (this.anchorMarker) {
            this.scene.remove(this.anchorMarker);
            this.anchorMarker.geometry.dispose();
            this.anchorMarker.material.dispose();
            this.anchorMarker = null;
        }
    }

    clearModel() {
        this.clearHelpers();
        if (!this.model) return;
        this.scene.remove(this.model);
        this.model.traverse((object) => {
            if (!object.isMesh || !object.material) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
        });
        this.model = null;
        this.loadedPath = null;
    }

    resize() {
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;
        if (!width || !height) return;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    startRendering() {
        cancelAnimationFrame(this.animationFrame);
        const render = () => {
            if (!this.active) return;
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            this.animationFrame = requestAnimationFrame(render);
        };
        render();
    }

    setStatus(message, isError = false) {
        this.status.textContent = message;
        this.status.classList.toggle('is-error', isError);
    }
}
