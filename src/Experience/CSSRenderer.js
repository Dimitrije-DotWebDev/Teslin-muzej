import Experience from "./Experience.js";
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export default class CSSRenderer {

    constructor() {

        this.experience = new Experience();

        this.sizes = this.experience.sizes;
        this.scene = this.experience.scene;
        this.camera = this.experience.camera;

        this.setInstance();
    }

    setInstance() {

        this.instance = new CSS2DRenderer();

        this.instance.setSize(this.sizes.width, this.sizes.height);

        this.instance.domElement.style.position = 'absolute';
        this.instance.domElement.style.top = '0px';
        this.instance.domElement.style.left = '0px';
        this.instance.domElement.style.pointerEvents = 'none';
        this.instance.domElement.style.zIndex = '5';

        document.body.appendChild(this.instance.domElement);
    }

    resize() {
        this.instance.setSize(this.sizes.width, this.sizes.height);
    }

    update() {
        this.instance.render(this.scene, this.camera.instance);
    }
}