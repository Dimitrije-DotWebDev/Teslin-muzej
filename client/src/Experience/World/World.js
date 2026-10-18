import * as THREE from 'three';
import Experience from "../Experience.js";
import Environment from './Environment.js';
import Exhibit from './Exhibit.js';
import RotatingMotorBehavior from './behaviors/RotatingMotorBehavior.js';
import Floor from './Floor.js';
import gsap from 'gsap';
import rollingSound from '../../../static/audio/rollingSound/rolling.wav';
import ExhibitCatalog from '../UI/ExhibitCatalog.js';
import LoadingScreen from '../Utils/LoadingScreen.js';
import ExhibitApi from '../Api/ExhibitApi.js';
import AdminPanel from '../UI/AdminPanel.js';

export default class World{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.loadingScreen = new LoadingScreen();
        const apiUrl = new URLSearchParams(window.location.search).get('api')
            || window.TESLA_MUSEUM_API_URL;
        this.exhibitApi = new ExhibitApi(apiUrl);
        this.exhibitTypes = {
            'two-phase-motor': {
                Behavior: RotatingMotorBehavior
            },
            'three-phase-motor': {
                Behavior: RotatingMotorBehavior
            }
        };
        this.resources.on('ready', async ()=>{
            this.envronment = new Environment();
            this.floor = new Floor();
            this.adminPanel = new AdminPanel(
                this.exhibitApi,
                (path) => this.resources.loadModel(this.exhibitApi.resolveAssetUrl(path)),
                () => this.refreshCatalog()
            );
            await this.initializeCatalog();
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
        const t1 = gsap.timeline({
            onComplete: () => {
                setTimeout(() => {
                    this.activeExhibit.setAnimation();
                    this.rollingAudio = new Audio(rollingSound);
                    this.rollingAudio.loop = true;
                    this.rollingAudio.play();
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

    async openExhibit(exhibitData){
        if (this.isOpeningExhibit) return;

        this.isOpeningExhibit = true;
        this.catalog.setBusy(exhibitData.id, true);
        this.loadingScreen.show();

        try {
            const details = await this.exhibitApi.getExhibit(exhibitData.id);
            const exhibitType = this.exhibitTypes[details.behaviorType];
            if (!exhibitType || !details.modelPath) {
                throw new Error('Unsupported exhibit behavior: ' + details.behaviorType + '.');
            }

            const resource = await this.resources.loadModel(
                this.exhibitApi.resolveAssetUrl(details.modelPath),
                (progress) => this.loadingScreen.setProgress(progress * 0.85)
            );

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
            this.loadingScreen.hide();
            this.introAnimation();
        } catch (error) {
            console.error(error);
            this.loadingScreen.hide();
            this.catalog.showError('Експонат тренутно није могуће учитати. Покушајте поново.');
        } finally {
            this.catalog.setBusy(exhibitData.id, false);
            this.isOpeningExhibit = false;
        }
    }
    update(){
        this.activeExhibit?.update();
    }
}
