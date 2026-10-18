import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class AdminFieldEditor {
    constructor(root, loadModel, getModelPath, onReferenceChange, onRotationChange, onTransformChange) {
        this.root = root;
        this.loadModel = loadModel;
        this.getModelPath = getModelPath;
        this.onReferenceChange = onReferenceChange;
        this.onRotationChange = onRotationChange;
        this.onTransformChange = onTransformChange;
        this.canvas = root.querySelector('.admin-field-canvas');
        this.viewport = root.querySelector('.admin-field-viewport');
        this.hint = root.querySelector('.admin-field-hint');
        this.status = root.querySelector('.admin-field-status');
        this.previewSelect = root.querySelector('.admin-field-preview');
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.parts = new Map();
        this.mode = 'translate';
        this.pickMode = null;
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
        this.transformControls = new TransformControls(this.camera, this.canvas);
        this.scene.add(this.transformControls.getHelper());
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        this.transformControls.addEventListener('objectChange', () => this.emitTransform());
        this.scene.add(new THREE.HemisphereLight(0xbdeeff, 0x17202b, 2.4));
        const light = new THREE.DirectionalLight(0xffffff, 3.2);
        light.position.set(4, 7, 5);
        this.scene.add(light);
        this.proxy = new THREE.Group();
        this.scene.add(this.proxy);
        this.transformControls.attach(this.proxy);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewport);
    }

    bindEvents() {
        this.root.querySelector('.admin-field-reload').addEventListener('click', () => this.load());
        this.root.querySelector('.admin-field-pick-reference').addEventListener('click', () => {
            this.setPickMode(this.pickMode === 'reference' ? null : 'reference');
        });
        this.root.querySelector('.admin-field-pick-rotation').addEventListener('click', () => {
            this.setPickMode(this.pickMode === 'rotation' ? null : 'rotation');
        });
        this.root.querySelector('.admin-field-translate').addEventListener('click', () => this.setMode('translate'));
        this.root.querySelector('.admin-field-rotate').addEventListener('click', () => this.setMode('rotate'));
        this.root.querySelector('.admin-field-scale').addEventListener('click', () => this.setMode('scale'));
        this.previewSelect.addEventListener('change', () => this.rebuildPreview());
        this.canvas.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            this.press = { x: event.clientX, y: event.clientY };
        });
        this.canvas.addEventListener('pointerup', (event) => {
            if (!this.press || event.button !== 0 || !this.pickMode) return;
            const distance = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y);
            this.press = null;
            if (distance <= 5) this.pick(event);
        });
        this.canvas.addEventListener('pointerleave', () => {
            this.press = null;
        });
        this.setMode('translate');
    }

    async open(configuration) {
        this.active = true;
        this.configuration = configuration;
        this.root.hidden = false;
        this.resize();
        this.startRendering();
        await this.load();
    }

    close() {
        this.active = false;
        this.setPickMode(null);
        cancelAnimationFrame(this.animationFrame);
    }

    async load() {
        const path = this.getModelPath();
        if (!path) {
            this.setStatus('Унесите путању до GLB модела.', true);
            this.hint.hidden = false;
            return;
        }

        if (this.model && this.loadedPath === path) {
            this.applyConfiguration(this.configuration);
            return;
        }

        this.setStatus('Учитавање 3D модела…');
        try {
            const resource = await this.loadModel(path);
            this.setModel(resource.scene.clone(true));
            this.loadedPath = path;
            this.applyConfiguration(this.configuration);
            this.hint.hidden = true;
            this.setStatus(`Модел је учитан. Пронађено делова: ${this.parts.size}.`);
        } catch (error) {
            this.clearModel();
            this.setStatus(error.message?.startsWith('Duplicate museumPartId:')
                ? error.message
                : 'Модел није могуће учитати са унете путање.', true);
            this.hint.hidden = false;
        }
    }

    setModel(model) {
        this.clearModel();
        this.model = model;
        this.parts.clear();
        this.pickableMeshes = [];

        model.traverse((object) => {
            const partId = object.userData?.museumPartId;
            if (typeof partId === 'string' && partId.trim()) {
                const id = partId.trim();
                if (this.parts.has(id)) throw new Error(`Duplicate museumPartId: ${id}`);
                this.parts.set(id, object);
            }
            if (!object.isMesh) return;
            this.pickableMeshes.push(object);
            if (Array.isArray(object.material)) {
                object.material = object.material.map((material) => material.clone());
            } else if (object.material) {
                object.material = object.material.clone();
            }
        });

        this.scene.add(model);
        model.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const distance = Math.max(size.x, size.y, size.z, 1) * 1.6;
        this.camera.position.set(center.x + distance, center.y + distance * 0.55, center.z + distance);
        this.camera.near = Math.max(distance / 1000, 0.01);
        this.camera.far = distance * 20;
        this.camera.updateProjectionMatrix();
        this.controls.target.copy(center);
        this.controls.update();
    }

    applyConfiguration(configuration) {
        this.configuration = configuration;
        if (!configuration) {
            this.proxy.visible = false;
            this.transformControls.enabled = false;
            return;
        }

        this.proxy.visible = true;
        this.transformControls.enabled = true;
        this.syncing = true;
        const reference = this.parts.get(configuration.referencePartId);
        const base = reference
            ? reference.getWorldPosition(new THREE.Vector3())
            : new THREE.Vector3();
        this.proxy.position.set(
            base.x + configuration.transform.position.x,
            base.y + configuration.transform.position.y,
            base.z + configuration.transform.position.z
        );
        this.proxy.rotation.set(
            THREE.MathUtils.degToRad(configuration.transform.rotation.x),
            THREE.MathUtils.degToRad(configuration.transform.rotation.y),
            THREE.MathUtils.degToRad(configuration.transform.rotation.z)
        );
        this.proxy.scale.set(
            configuration.transform.scale.x,
            configuration.transform.scale.y,
            configuration.transform.scale.z
        );
        this.syncing = false;
        this.rebuildPreview();
    }

    rebuildPreview() {
        while (this.proxy.children.length) {
            const child = this.proxy.children[0];
            this.proxy.remove(child);
            child.traverse((object) => {
                object.geometry?.dispose();
                if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
                else object.material?.dispose();
            });
        }
        if (!this.configuration) return;

        if (this.previewSelect.value === 'engineering') this.addEngineeringPreview();
        else this.addArtisticPreview();
    }

    addArtisticPreview() {
        const profile = this.configuration.profile;
        let geometry;
        if (profile === 'static-dipole') geometry = new THREE.SphereGeometry(2.4, 24, 16);
        else if (profile === 'alternating-core') geometry = new THREE.BoxGeometry(4, 3, 1.5);
        else if (profile === 'linear-field') geometry = new THREE.BoxGeometry(5, 2, 2);
        else geometry = new THREE.CylinderGeometry(2.95, 2.95, 3.25, 32, 8, true);
        const material = new THREE.MeshBasicMaterial({
            color: 0x35c8ff,
            transparent: true,
            opacity: 0.2,
            wireframe: true,
            depthTest: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        if (profile === 'rotating-motor') mesh.rotation.x = Math.PI / 2;
        this.proxy.add(mesh);
    }

    addEngineeringPreview() {
        const group = new THREE.Group();
        const count = Math.min(this.configuration.engineering.coilCount, 32);
        const phaseCount = this.configuration.engineering.phaseCount;
        for (let index = 0; index < count; index++) {
            const angle = index / count * Math.PI * 2;
            const color = new THREE.Color().setHSL((index % phaseCount) / phaseCount, 0.85, 0.58);
            const coil = new THREE.Mesh(
                new THREE.TorusGeometry(0.2, 0.055, 8, 20),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false })
            );
            coil.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0);
            group.add(coil);
        }
        const fieldPlane = new THREE.Mesh(
            new THREE.CircleGeometry(3.1, 48),
            new THREE.MeshBasicMaterial({
                color: 0x35c8ff,
                transparent: true,
                opacity: 0.12,
                wireframe: true,
                depthTest: false
            })
        );
        group.add(fieldPlane);
        this.proxy.add(group);
    }

    setMode(mode) {
        this.mode = mode;
        this.transformControls.setMode(mode);
        ['translate', 'rotate', 'scale'].forEach((value) => {
            this.root.querySelector(`.admin-field-${value}`).classList.toggle('is-active', value === mode);
        });
        this.setPickMode(null);
    }

    setPickMode(mode) {
        this.pickMode = mode;
        this.canvas.classList.toggle('is-picking', Boolean(mode));
        this.transformControls.enabled = !mode && Boolean(this.configuration);
        this.root.querySelector('.admin-field-pick-reference').classList.toggle('is-active', mode === 'reference');
        this.root.querySelector('.admin-field-pick-rotation').classList.toggle('is-active', mode === 'rotation');
    }

    pick(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.set(
            (event.clientX - rect.left) / rect.width * 2 - 1,
            -(event.clientY - rect.top) / rect.height * 2 + 1
        );
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.pickableMeshes, false)[0];
        if (!hit) return;
        const selection = this.resolvePart(hit.object);
        if (!selection) {
            this.setStatus('Изабрани део нема museumPartId.', true);
            return;
        }

        if (this.pickMode === 'reference') this.onReferenceChange(selection.partId);
        if (this.pickMode === 'rotation') this.onRotationChange(selection.partId);
        this.setPickMode(null);
    }

    resolvePart(object) {
        let current = object;
        while (current && current !== this.model) {
            const partId = current.userData?.museumPartId;
            if (typeof partId === 'string' && partId.trim()) {
                return { partId: partId.trim(), object: current };
            }
            current = current.parent;
        }
        return null;
    }

    emitTransform() {
        if (this.syncing || !this.configuration) return;
        const reference = this.parts.get(this.configuration.referencePartId);
        const base = reference
            ? reference.getWorldPosition(new THREE.Vector3())
            : new THREE.Vector3();
        this.onTransformChange({
            position: {
                x: this.proxy.position.x - base.x,
                y: this.proxy.position.y - base.y,
                z: this.proxy.position.z - base.z
            },
            rotation: {
                x: THREE.MathUtils.radToDeg(this.proxy.rotation.x),
                y: THREE.MathUtils.radToDeg(this.proxy.rotation.y),
                z: THREE.MathUtils.radToDeg(this.proxy.rotation.z)
            },
            scale: {
                x: this.proxy.scale.x,
                y: this.proxy.scale.y,
                z: this.proxy.scale.z
            }
        });
    }

    clearModel() {
        if (!this.model) return;
        this.model.removeFromParent();
        this.model.traverse((object) => {
            if (!object.isMesh || !object.material) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
        });
        this.model = null;
        this.loadedPath = null;
        this.parts.clear();
        this.pickableMeshes = [];
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
