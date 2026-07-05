import {GUI} from 'dat.gui';
export default class Debug{
    constructor(){
        this.active = window.location.hash === '#debug';
        if(this.active){
            this.ui = new GUI();
            const closeBtn = this.ui.__closeButton;

            if (closeBtn) {
                const updateText = () => {
                    console.log(this.ui);
                    closeBtn.innerHTML = this.ui.closed
                        ? 'Отвори контролу'
                        : 'Затвори контролу';
                };

                updateText();

                closeBtn.addEventListener('click', () => {
                    setTimeout(updateText, 0);
                });
            }
        }
    }
}