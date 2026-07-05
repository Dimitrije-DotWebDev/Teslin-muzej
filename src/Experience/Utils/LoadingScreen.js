export default class LoadingScreen {

    constructor() {
        this.el = document.getElementById("loadingScreen");

        this.bar = this.el.querySelector(".bar");

        this.progress = 0;
    }

    show() {
        this.el.classList.remove("hidden");
        this.setProgress(0);
    }

    hide() {
        this.setProgress(1);

        setTimeout(() => {
            this.el.classList.add("hidden");
        }, 150);
    }

    setProgress(value) {
        this.progress = value;

        if (this.bar) {
            this.bar.style.width = `${value * 100}%`;
        }
    }
}