import {GUI} from 'dat.gui';
export default class Debug{
    constructor(){
        this.active = window.location.hash === '#debug';
        if(this.active){
            this.ui = new GUI();
            this.setCloseButtonText(this.ui);
        }
    }

    getControls(){
        if(this.active) return this.ui;

        if(!this.controls){
            this.controls = new GUI();
            this.setCloseButtonText(this.controls);
        }

        return this.controls;
    }

    setCloseButtonText(gui){
        const closeBtn = gui.__closeButton;

        if (!closeBtn) return;

        const updateText = () => {
            closeBtn.innerHTML = gui.closed
                ? 'Отвори контролу'
                : 'Затвори контролу';
        };

        updateText();
        closeBtn.addEventListener('click', () => setTimeout(updateText, 0));
    }

    destroy(){
        this.controls?.destroy();
        if(this.ui && this.ui !== this.controls) this.ui.destroy();
    }
}
