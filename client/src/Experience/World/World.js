import * as THREE from 'three';
import Experience from "../Experience.js";
import Environment from './Environment.js';
import Exhibit from './Exhibit.js';
import RotatingMotorBehavior from './behaviors/RotatingMotorBehavior.js';
import SymmetricMotorBehavior from './behaviors/SymmetricMotorBehavior.js';
import TransformerBehavior from './behaviors/TransformerBehavior.js';
import Floor from './Floor.js';
import gsap from 'gsap';
import rollingSound from '../../../static/audio/rollingSound/rolling.wav';
import ExhibitCatalog from '../UI/ExhibitCatalog.js';
import LoadingScreen from '../Utils/LoadingScreen.js';
import ExhibitApi from '../Api/ExhibitApi.js';
import AdminPanel from '../UI/AdminPanel.js';
import AutomaticTour from '../UI/AutomaticTour.js';
import { baseURL } from '../../config.js';

export default class World{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.loadingScreen = new LoadingScreen();
        this.backButton = document.getElementById('back-to-catalog');
        this.backButton.addEventListener('click', () => this.returnToCatalog());
        const apiUrl = new URLSearchParams(window.location.search).get('api')
            || window.TESLA_MUSEUM_API_URL
            || baseURL;
        this.exhibitApi = new ExhibitApi(apiUrl);
        this.exhibitTypes = {
            'two-phase-motor': {
                Behavior: RotatingMotorBehavior
            },
            'three-phase-motor': {
                Behavior: RotatingMotorBehavior
            },
            'magnetic-motor': {
                Behavior: RotatingMotorBehavior
            },
            'electromagnetic-motor': {
                Behavior: RotatingMotorBehavior
            },
            'symmetric-motor': {
                Behavior: SymmetricMotorBehavior
            },
            'transformer': {
                Behavior: TransformerBehavior
            }
        };
        this.resources.on('ready', async ()=>{
            this.envronment = new Environment();
            this.floor = new Floor();
            this.adminPanel = new AdminPanel(
                this.exhibitApi,
                (path) => this.resources.loadModel(this.exhibitApi.resolveAssetUrl(path)),
                () => this.refreshCatalog(),
                this.resources.items.environmentMap
            );
            await this.initializeCatalog();
            if (this.catalog) this.automaticTour = new AutomaticTour(this);
        });
    }
    async initializeCatalog(){
        try {
            const exhibits = await this.exhibitApi.getCatalog();
            this.catalog = new ExhibitCatalog(
                exhibits,
                (exhibit) => this.openExhibit(exhibit),
                (path) => this.exhibitApi.resolveAssetUrl(path)
            );
            if (!this.adminPanel.isAdminRoute()) this.catalog.show();
        } catch (error) {
            console.error(error);
            if (!this.adminPanel.isAdminRoute()) {
                const catalogScreen = document.getElementById('catalog-screen');
                catalogScreen.hidden = false;
                requestAnimationFrame(() => catalogScreen.classList.add('is-visible'));
            }
            document.querySelector('.catalog-status').textContent = 'Каталог тренутно није доступан. Проверите да ли је backend покренут.';
        }
    }
    async refreshCatalog(){
        const exhibits = await this.exhibitApi.getCatalog();
        this.catalog?.setExhibits(exhibits);
    }
    introAnimation(){
        const exhibit = this.activeExhibit;
        const t1 = this.introTimeline = gsap.timeline({
            onComplete: () => {
                this.animationStartTimer = setTimeout(() => {
                    if (this.activeExhibit !== exhibit) return;
                    exhibit.setAnimation();
                    if (exhibit.behavior.usesRollingSound) {
                        this.rollingAudio = new Audio(rollingSound);
                        this.rollingAudio.loop = true;
                        this.rollingAudio.play().catch(() => {});
                    }
                }, 1000);
                this.envronment.ambientLight.intensity = 1.5;
                this.envronment.sunLight.intensity = 5;
            }
        });
        t1.to(this.envronment.sunLight, {intensity: 0, duration: 0.6})
          .to(this.envronment.sunLight, {intensity: 7, duration: 0.8})
          .to(this.envronment.sunLight, {intensity: 3, duration: 0.3})
          .to(this.envronment.sunLight, {intensity: 5, duration: 0.7});

        t1.to(this.envronment.ambientLight, {intensity: 0, duration: 0.6})
          .to(this.envronment.ambientLight, {intensity: 2, duration: 0.8})
          .to(this.envronment.ambientLight, {intensity: 0.5, duration: 0.3})
          .to(this.envronment.ambientLight, {intensity: 1.5, duration: 0.4}, "0");

        t1.to(this.experience.camera.instance.position, {x: -1, y: 3, z: 13, duration: 3, ease: "power2.inOut"}, "0");
    }

    returnToCatalog({ focus = true } = {}){
        if (!this.activeExhibit || this.isOpeningExhibit) return;
        this.backButton.hidden = true;
        this.introTimeline?.kill();
        clearTimeout(this.animationStartTimer);
        this.rollingAudio?.pause();
        this.rollingAudio = null;
        this.activeExhibit.dispose();
        this.activeExhibit = null;
        this.activeExhibitId = null;
        this.experience.camera.controls.target.set(0, 0, 0);
        if (!this.experience.debug.active) this.experience.debug.getControls().hide();
        this.envronment.ambientLight.intensity = 1.5;
        this.envronment.sunLight.intensity = 5;
        this.catalog.show();
        if (focus) this.catalog.grid.querySelector('.catalog-card:not(:disabled)')?.focus();
    }

    async openExhibit(exhibitData, { shouldContinue = () => true } = {}){
        if (this.isOpeningExhibit) return false;

        this.isOpeningExhibit = true;
        this.catalog.setBusy(exhibitData.id, true);
        this.loadingScreen.show();

        try {
            const details = await this.exhibitApi.getExhibit(exhibitData.id);
            if (!shouldContinue()) { this.loadingScreen.hide(); return false; }
            const exhibitType = this.exhibitTypes[details.behaviorType];
            if (!exhibitType || !details.modelPath) {
                throw new Error('Unsupported exhibit behavior: ' + details.behaviorType + '.');
            }

            const resource = await this.resources.loadModel(
                this.exhibitApi.resolveAssetUrl(details.modelPath),
                (progress) => this.loadingScreen.setProgress(progress * 0.85)
            );

            if (!shouldContinue()) { this.loadingScreen.hide(); return false; }

            this.loadingScreen.setProgress(0.9);
            this.activeExhibit = new Exhibit({
                position: new THREE.Vector3(0, 1.33, 0),
                resource,
                config: {
                    field: details.field,
                    hotspots: details.hotspots
                },
                Behavior: exhibitType.Behavior
            });

            this.catalog.hide();
            this.activeExhibitId = exhibitData.id;
            this.experience.debug.getControls().show();
            this.backButton.hidden = false;
            this.loadingScreen.hide();
            this.introAnimation();
            return true;
        } catch (error) {
            console.error(error);
            this.loadingScreen.hide();
            this.catalog.showError('Експонат тренутно није могуће учитати. Покушајте поново.');
            return false;
        } finally {
            this.catalog.setBusy(exhibitData.id, false);
            this.isOpeningExhibit = false;
        }
    }
    update(){
        this.automaticTour?.update();
        this.activeExhibit?.update();
    }
}
