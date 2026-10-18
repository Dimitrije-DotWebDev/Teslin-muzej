export default class ExhibitCatalog {
    constructor(exhibits, onSelect, resolveAssetUrl = (path) => path) {
        this.exhibits = [...exhibits].sort((first, second) => first.displayOrder - second.displayOrder);
        this.onSelect = onSelect;
        this.resolveAssetUrl = resolveAssetUrl;
        this.element = document.getElementById('catalog-screen');
        this.grid = this.element.querySelector('.catalog-grid');
        this.status = this.element.querySelector('.catalog-status');
        this.render();
    }

    render() {
        this.grid.replaceChildren();

        this.exhibits.forEach((exhibit, index) => {
            const card = document.createElement('button');
            const number = String(index + 1).padStart(2, '0');
            const media = document.createElement('span');
            const numberLabel = document.createElement('span');
            const field = document.createElement('span');
            const copy = document.createElement('span');
            const eyebrow = document.createElement('span');
            const title = document.createElement('span');
            const action = document.createElement('span');

            card.type = 'button';
            card.className = 'catalog-card';
            card.disabled = !exhibit.isAvailable;
            card.dataset.exhibitId = exhibit.id;
            media.className = 'catalog-card-media';
            numberLabel.className = 'catalog-card-number';
            field.className = 'catalog-card-field';
            copy.className = 'catalog-card-copy';
            eyebrow.className = 'catalog-card-eyebrow';
            title.className = 'catalog-card-title';
            action.className = 'catalog-card-action';
            field.setAttribute('aria-hidden', 'true');
            numberLabel.textContent = number;
            eyebrow.textContent = exhibit.eyebrow;
            title.textContent = exhibit.title;
            action.textContent = exhibit.isAvailable ? 'Отворите експонат' : 'У припреми';
            if (exhibit.thumbnailPath) {
                media.style.backgroundImage = `url(${JSON.stringify(this.resolveAssetUrl(exhibit.thumbnailPath))})`;
            }
            media.append(numberLabel, field);
            copy.append(eyebrow, title, action);
            card.append(media, copy);

            if (exhibit.isAvailable) {
                card.addEventListener('click', () => this.onSelect(exhibit));
            }

            this.grid.appendChild(card);
        });
    }

    setExhibits(exhibits) {
        this.exhibits = [...exhibits].sort((first, second) => first.displayOrder - second.displayOrder);
        this.render();
    }

    show() {
        this.element.hidden = false;
        requestAnimationFrame(() => this.element.classList.add('is-visible'));
    }

    hide() {
        this.element.classList.remove('is-visible');
        setTimeout(() => {
            this.element.hidden = true;
        }, 500);
    }

    setBusy(exhibitId, value) {
        this.grid.querySelectorAll('.catalog-card').forEach((card) => {
            card.disabled = value || !this.exhibits.find((exhibit) => exhibit.id === card.dataset.exhibitId)?.isAvailable;
            card.classList.toggle('is-loading', value && card.dataset.exhibitId === exhibitId);
        });

        this.status.textContent = value ? 'Учитавање експоната…' : '';
    }

    showError(message) {
        this.status.textContent = message;
    }
}
