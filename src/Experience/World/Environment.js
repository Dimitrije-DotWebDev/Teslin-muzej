import * as THREE from 'three';
import Experience from "../Experience.js";
export default class Environment{
    constructor(){
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.debug = this.experience.debug;

        if(this.debug.active){
            this.debugFolder = this.debug.ui.addFolder("enviornment");
            this.debugSlideshow = this.debug.ui.addFolder("slideshow");
        }
        this.setSunLight();
        this.setAmbientLight();
        this.setBackground();
    }
    setSunLight(){
        this.sunLight = new THREE.DirectionalLight('#ffffff', 5);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.camera.near = 2.5;
        this.sunLight.shadow.camera.far = 150;
        this.sunLight.shadow.mapSize.set(32768, 32768);
        const d = 180;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0005;
        this.sunLight.shadow.normalBias = 0.02;
        this.sunLight.position.set(30,60,-20);
        this.sunLight.target.position.set(0, 0, 0);
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        if(this.debug.active){
            this.debugFolder
                .add(this.sunLight, 'intensity')
                .name('sunLightIntensity')
                .min(0)
                .max(10)
                .step(0.001);
            this.debugFolder
                .add(this.sunLight.position, 'x')
                .name('sunLightX')
                .min(-100)
                .max(100)
                .step(0.001);
            this.debugFolder
                .add(this.sunLight.position, 'y')
                .name('sunLightY')
                .min(-100)
                .max(100)
                .step(0.001);
            this.debugFolder
                .add(this.sunLight.position, 'z')
                .name('sunLightZ')
                .min(-100)
                .max(100)
                .step(0.001);
        }
    }
    setAmbientLight(){
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(this.ambientLight);
        if(this.debug.active){
            this.debugFolder
                .add(this.ambientLight, 'intensity')
                .name('ambientLightIntensity')
                .min(0)
                .max(10)
                .step(0.001);
        }

    }

    addImageToSliderButton(){
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.style.display = 'none';

        document.body.appendChild(this.fileInput);

        this.fileInput.addEventListener('change', (event) => {

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {

            const imageDataUrl = e.target.result;

            // Dodaj novu sliku u niz
            this.images.push(imageDataUrl);

            console.log("Nova slika dodata u slideshow");

            // (Opcionalno) odmah prebaci na novu sliku
            this.index = this.images.length - 2;

            this.restartSlideshow();
            };

            reader.readAsDataURL(file);
        });
    }

    setBackground(){
        this.addImageToSliderButton();
        this.SlideShowInterval = {value: 6};
        this.SlideshowOpacity = {value: 75};
        this.overlay = document.getElementById("overlay");
        this.overlay.style.background = `rgba(0, 0, 0, ${this.SlideshowOpacity.value/100})`;
        this.images = [
            '/textures/background/Tesla-background.jpeg',
            '/textures/background/Tesla-Museum-1.jpg',
            '/textures/background/Tesla-Museum-2.jpg',
            '/textures/background/Tesla-Museum-3.jpg',
            '/textures/background/Tesla-Museum-4.jpg',
        ];

        this.index = 0;
        this.active = true;
        this.intervalId = null;

        this.bg1 = document.getElementById('bg1');
        this.bg2 = document.getElementById('bg2');

        this.bg1.style.backgroundImage = `url(${this.images[0]})`;

        this.startSlideshow();
        

        if (this.debug.active) {

            this.debugSlideshow
                .add(this.SlideShowInterval, 'value')
                .name('Slideshow interval')
                .min(1)
                .max(15)
                .step(1)
                .onChange(() => {
                    this.restartSlideshow();
                });
            this.debugSlideshow
                .add(this.SlideshowOpacity, 'value')
                .name('Slideshow darkness')
                .min(0)
                .max(100)
                .step(1)
                .onChange(() => {
                    this.overlay.style.background = `rgba(0, 0, 0, ${this.SlideshowOpacity.value/100})`;
                });
            if (this.debug.active) {

                const uploadObj = {
                    Upload_Image: () => {
                        this.fileInput.click();
                    }
                };

                this.debugSlideshow.add(uploadObj, 'Upload_Image')
                    .name('Add Image From PC');
            }
        }
    }

    startSlideshow(){
        this.intervalId = setInterval(() => {

            this.index = (this.index + 1) % this.images.length;

            if (this.active) {
                this.bg2.style.backgroundImage = `url(${this.images[this.index]})`;
                this.bg2.style.opacity = 1;
                this.bg1.style.opacity = 0;
            } else {
                this.bg1.style.backgroundImage = `url(${this.images[this.index]})`;
                this.bg1.style.opacity = 1;
                this.bg2.style.opacity = 0;
            }

            this.active = !this.active;

        }, this.SlideShowInterval.value * 1000);
    }

    stopSlideshow() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    restartSlideshow() {
        this.stopSlideshow();
        this.startSlideshow();
    }
}