import * as THREE from 'three';
import Experience from '../Experience.js';
import ModelPartRegistry from '../Utils/ModelPartRegistry.js';
import HotspotController from './HotspotController.js';
import MagneticFieldContext from './MagneticFieldContext.js';

export default class Exhibit {
    constructor({ position, resource, config, Behavior }) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.time = this.experience.time;
        this.debug = this.experience.debug;
        this.resource = resource;
        this.position = position;
        this.config = config;
        this.activeFieldSystem = null;

        this.setModel();
        this.setField();
        this.setHotspots();

        this.behavior = new Behavior(this);
        this.behavior.initialize();
    }

    setField() {
        if (!this.config.field) return;
        this.fieldContext = new MagneticFieldContext(this, this.config.field);
    }

    setModel() {
        this.model = this.resource.scene;
        this.model.position.copy(this.position);
        this.scene.add(this.model);
        this.partRegistry = new ModelPartRegistry(this.model);

        this.model.traverse((child) => {
            if (!child.isMesh) return;

            child.castShadow = true;
            child.receiveShadow = true;
        });
    }

    setHotspots() {
        this.hotspotMeshes = {};
        this.hotspots = [];
        this.hotspotDefinitionsById = {};
        this.hotspotController = new HotspotController(this.experience, this.model);

        const definitions = [...(this.config.hotspots ?? [])]
            .sort((first, second) => first.displayOrder - second.displayOrder);

        for (const data of definitions) {
            this.hotspotDefinitionsById[data.id] = data;

            if (data.isEnabled === false) continue;

            const mesh = this.partRegistry.getRequired(data.anchorPartId);
            const targets = this.partRegistry.getRequiredMany(data.targetPartIds);
            const localPosition = new THREE.Vector3(
                data.localPosition.x,
                data.localPosition.y,
                data.localPosition.z
            );

            this.hotspotMeshes[data.id] = mesh;
            this.hotspots.push(this.hotspotController.add({
                id: data.id,
                target: mesh,
                targets,
                localPosition,
                title: data.title,
                description: data.description
            }));
        }
    }

    addHotspotControls(folder, params) {
        params.hotspotsVisible = true;

        const hotspotFolder = folder.addFolder('Тачке интеракције');

        hotspotFolder
            .add(params, 'hotspotsVisible')
            .name('Видљиве')
            .onChange((value) => this.hotspotController.setVisible(value));
    }

    setAnimation() {
        this.behavior.setAnimation();
    }

    update() {
        this.behavior.update();
        this.fieldContext?.update();
        this.hotspotController.update();
        this.activeFieldSystem?.update();
    }

    dispose() {
        this.activeFieldSystem?.destroy?.();
        this.activeFieldSystem = null;
        this.fieldContext?.dispose();
        this.fieldContext = null;
        this.behavior.dispose();
        this.hotspotController.dispose();
        const controlsFolder = this.behavior.controlsFolder;
        if (controlsFolder) controlsFolder.parent.removeFolder(controlsFolder);
        this.model.removeFromParent();
    }
}
