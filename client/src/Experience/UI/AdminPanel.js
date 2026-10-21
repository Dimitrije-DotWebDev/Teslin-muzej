import AdminModelEditor from './AdminModelEditor.js';
import AdminFieldEditor from './AdminFieldEditor.js';
import ModelPartRegistry from '../Utils/ModelPartRegistry.js';

export default class AdminPanel {
    constructor(api, validateModel, onCatalogChanged, environmentMap) {
        this.api = api;
        this.validateModel = validateModel;
        this.onCatalogChanged = onCatalogChanged;
        this.screen = document.getElementById('admin-screen');
        this.list = this.screen.querySelector('.admin-list');
        this.form = this.screen.querySelector('.admin-form');
        this.status = this.screen.querySelector('.admin-status');
        this.formTitle = this.screen.querySelector('.admin-form-title');
        this.submitButton = this.form.querySelector('[type="submit"]');
        this.thumbnailPreview = this.form.querySelector('.admin-thumbnail-preview');
        this.thumbnailImage = this.thumbnailPreview.querySelector('img');
        this.thumbnailFileInput = this.form.elements.thumbnailFile;
        this.modelFileInput = this.form.elements.modelFile;
        this.modelFileName = this.form.querySelector('.admin-model-file-name');
        this.fieldValues = this.form.querySelector('.admin-field-values');
        this.fieldEditor = new AdminFieldEditor(
            this.form.querySelector('.admin-field-model-editor'),
            validateModel,
            () => this.form.elements.modelPath.value.trim(),
            (partId) => this.setFieldPart('fieldReferencePartId', partId),
            (partId) => this.setFieldPart('fieldRotationPartId', partId),
            (transform) => this.setFieldTransform(transform),
            environmentMap
        );
        this.hotspotSection = this.screen.querySelector('.admin-hotspots');
        this.hotspotList = this.screen.querySelector('.admin-hotspot-list');
        this.hotspotForm = this.screen.querySelector('.admin-hotspot-form');
        this.hotspotFormTitle = this.screen.querySelector('.admin-hotspot-form-title');
        this.hotspotSubmitButton = this.hotspotForm.querySelector('[type="submit"]');
        this.modelEditor = new AdminModelEditor(
            this.hotspotForm.querySelector('.admin-model-editor'),
            validateModel,
            () => this.form.elements.modelPath.value.trim(),
            (partId, position) => this.setAnchorFromModel(partId, position),
            (partIds) => this.setTargetsFromModel(partIds),
            environmentMap
        );
        this.bindEvents();
        this.syncRoute();
    }

    bindEvents() {
        window.addEventListener('popstate', () => this.syncRoute());
        this.screen.querySelector('.admin-close').addEventListener('click', () => this.navigateToCatalog());
        this.screen.querySelector('.admin-new').addEventListener('click', () => this.openForm());
        this.screen.querySelector('.admin-cancel').addEventListener('click', () => this.closeForm());
        this.screen.querySelector('.admin-validate-model').addEventListener('click', () => this.validateModelPath());
        this.modelFileInput.addEventListener('change', () => this.selectModel());
        this.screen.querySelector('.admin-model-remove').addEventListener('click', () => this.removeModel());
        this.thumbnailFileInput.addEventListener('change', () => this.selectThumbnail());
        this.screen.querySelector('.admin-thumbnail-remove').addEventListener('click', () => this.removeThumbnail());
        this.form.addEventListener('submit', (event) => this.save(event));
        this.form.elements.fieldEnabled.addEventListener('change', () => this.setFieldEnabled());
        this.form.elements.behaviorType.addEventListener('change', () => this.setBehaviorDefaults());
        [
            'fieldProfile', 'fieldReferencePartId', 'fieldRotationPartId', 'fieldRotationAxis',
            'fieldAngleMultiplier', 'fieldPhaseOffsetDegrees', 'fieldPositionX', 'fieldPositionY',
            'fieldPositionZ', 'fieldTransformRotationX', 'fieldTransformRotationY',
            'fieldTransformRotationZ', 'fieldScaleX', 'fieldScaleY', 'fieldScaleZ',
            'fieldPhaseCount', 'fieldCoilCount', 'fieldPolePairs',
            'fieldShowVirtualMagnet', 'fieldShowTorqueVector'
        ].forEach((name) => {
            this.form.elements[name].addEventListener('change', () => this.syncFieldEditor());
        });
        this.screen.querySelector('.admin-hotspot-new').addEventListener('click', () => this.openHotspotForm());
        this.screen.querySelector('.admin-hotspot-cancel').addEventListener('click', () => this.closeHotspotForm());
        this.hotspotForm.addEventListener('submit', (event) => this.saveHotspot(event));
        ['anchorPartId', 'positionX', 'positionY', 'positionZ', 'targetPartIds'].forEach((name) => {
            this.hotspotForm.elements[name].addEventListener('change', () => this.syncModelSelection());
        });
    }

    isAdminRoute() {
        return window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/admin';
    }

    syncRoute() {
        if (this.isAdminRoute()) {
            this.open();
        } else {
            this.hide();
        }
    }

    async open() {
        const catalogScreen = document.getElementById('catalog-screen');
        catalogScreen.classList.remove('is-visible');
        catalogScreen.hidden = true;
        this.screen.hidden = false;
        requestAnimationFrame(() => this.screen.classList.add('is-visible'));
        await this.load();
    }

    navigateToCatalog() {
        window.location.assign('/' + window.location.search);
    }

    hide() {
        if (this.screen.hidden) return;

        this.screen.classList.remove('is-visible');
        this.closeForm();
        setTimeout(() => {
            this.screen.hidden = true;
            const catalogScreen = document.getElementById('catalog-screen');
            catalogScreen.hidden = false;
            requestAnimationFrame(() => catalogScreen.classList.add('is-visible'));
        }, 300);
    }

    async load() {
        this.setStatus('Учитавање…');
        try {
            this.exhibits = await this.api.getAdminExhibits();
            this.renderList();
            this.setStatus(this.exhibits.length ? '' : 'Још нема унетих експоната.');
        } catch (error) {
            this.setStatus(error.message, true);
        }
    }

    renderList() {
        this.list.replaceChildren();

        this.exhibits.forEach((exhibit) => {
            const item = document.createElement('article');
            const copy = document.createElement('div');
            const title = document.createElement('h3');
            const metadata = document.createElement('p');
            const actions = document.createElement('div');
            const editButton = this.createButton('Измени', 'admin-secondary');
            const availabilityButton = this.createButton(
                exhibit.isAvailable ? 'Повуци из каталога' : 'Објави',
                exhibit.isAvailable ? 'admin-secondary' : 'admin-primary'
            );
            const deleteButton = this.createButton('Обриши', 'admin-danger');

            item.className = 'admin-list-item';
            copy.className = 'admin-list-copy';
            actions.className = 'admin-list-actions';
            title.textContent = exhibit.title;
            metadata.textContent = `${exhibit.slug} · ${exhibit.isAvailable ? 'Објављен' : 'Нацрт'}`;
            editButton.addEventListener('click', () => this.openForm(exhibit));
            availabilityButton.addEventListener('click', () => this.toggleAvailability(exhibit));
            deleteButton.addEventListener('click', () => this.delete(exhibit));
            copy.append(title, metadata);
            actions.append(editButton, availabilityButton, deleteButton);
            item.append(copy, actions);
            this.list.appendChild(item);
        });
    }

    createButton(label, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        return button;
    }

    openForm(exhibit = null) {
        this.editingId = exhibit?.id || null;
        this.form.reset();
        this.form.elements.id.value = this.editingId || '';
        this.formTitle.textContent = exhibit ? 'Измена експоната' : 'Нови експонат';
        this.submitButton.textContent = exhibit ? 'Сачувај измене' : 'Сачувај нацрт';

        if (exhibit) {
            Object.entries(exhibit).forEach(([key, value]) => {
                if (this.form.elements[key]) this.form.elements[key].value = value ?? '';
            });
        } else {
            this.form.elements.behaviorType.value = 'two-phase-motor';
            this.form.elements.displayOrder.value = this.exhibits.length;
        }

        this.setThumbnailPreview(exhibit?.thumbnailPath ?? null);
        this.setModelPath(exhibit?.modelPath ?? null);

        this.setFieldForm(exhibit?.field ?? null);

        this.form.hidden = false;
        this.setFieldEnabled();
        this.form.elements.title.focus();
        this.setStatus('');

        if (exhibit) {
            this.hotspotSection.hidden = false;
            this.loadHotspots(exhibit.id);
        } else {
            this.hotspotSection.hidden = true;
            this.closeHotspotForm();
        }
    }

    closeForm() {
        this.editingId = null;
        this.form.hidden = true;
        this.form.reset();
        this.hotspotSection.hidden = true;
        this.hotspotList.replaceChildren();
        this.hotspots = [];
        this.closeHotspotForm();
        this.fieldEditor.close();
        this.clearThumbnailObjectUrl();
        this.modelFileName.textContent = '';
    }

    getFormData() {
        const form = this.form.elements;
        return {
            slug: form.slug.value.trim(),
            title: form.title.value.trim(),
            eyebrow: form.eyebrow.value.trim(),
            description: form.description.value.trim(),
            behaviorType: form.behaviorType.value.trim(),
            modelPath: form.modelPath.value.trim() || null,
            thumbnailPath: form.thumbnailPath.value.trim() || null,
            field: this.getFieldFormData(),
            displayOrder: Number(form.displayOrder.value)
        };
    }

    setFieldForm(field) {
        const form = this.form.elements;
        form.fieldEnabled.checked = Boolean(field);
        form.fieldProfile.value = field?.profile ?? 'rotating-field';
        form.fieldReferencePartId.value = field?.referencePartId ?? '';
        form.fieldRotationPartId.value = field?.rotationPartId ?? '';
        form.fieldRotationAxis.value = field?.rotationAxis ?? 'z';
        form.fieldAngleMultiplier.value = field?.angleMultiplier ?? 1;
        form.fieldPhaseOffsetDegrees.value = field?.phaseOffsetDegrees ?? 0;
        form.fieldPositionX.value = field?.transform.position.x ?? 0;
        form.fieldPositionY.value = field?.transform.position.y ?? 0;
        form.fieldPositionZ.value = field?.transform.position.z ?? 0;
        form.fieldTransformRotationX.value = field?.transform.rotation.x ?? 0;
        form.fieldTransformRotationY.value = field?.transform.rotation.y ?? 0;
        form.fieldTransformRotationZ.value = field?.transform.rotation.z ?? 0;
        form.fieldScaleX.value = field?.transform.scale.x ?? 1;
        form.fieldScaleY.value = field?.transform.scale.y ?? 1;
        form.fieldScaleZ.value = field?.transform.scale.z ?? 1;
        form.fieldPhaseCount.value = field?.engineering.phaseCount ?? 2;
        form.fieldCoilCount.value = field?.engineering.coilCount ?? 8;
        form.fieldPolePairs.value = field?.engineering.polePairs ?? 1;
        form.fieldShowVirtualMagnet.checked = field?.engineering.showVirtualMagnet ?? true;
        form.fieldShowTorqueVector.checked = field?.engineering.showTorqueVector ?? true;
    }

    getFieldFormData() {
        const form = this.form.elements;
        if (!form.fieldEnabled.checked) return null;

        return {
            profile: form.fieldProfile.value,
            referencePartId: form.fieldReferencePartId.value.trim(),
            rotationPartId: form.fieldRotationPartId.value.trim(),
            transform: {
                position: {
                    x: Number(form.fieldPositionX.value),
                    y: Number(form.fieldPositionY.value),
                    z: Number(form.fieldPositionZ.value)
                },
                rotation: {
                    x: Number(form.fieldTransformRotationX.value),
                    y: Number(form.fieldTransformRotationY.value),
                    z: Number(form.fieldTransformRotationZ.value)
                },
                scale: {
                    x: Number(form.fieldScaleX.value),
                    y: Number(form.fieldScaleY.value),
                    z: Number(form.fieldScaleZ.value)
                }
            },
            rotationAxis: form.fieldRotationAxis.value,
            angleMultiplier: Number(form.fieldAngleMultiplier.value),
            phaseOffsetDegrees: Number(form.fieldPhaseOffsetDegrees.value),
            engineering: {
                phaseCount: Number(form.fieldPhaseCount.value),
                coilCount: Number(form.fieldCoilCount.value),
                polePairs: Number(form.fieldPolePairs.value),
                showVirtualMagnet: form.fieldShowVirtualMagnet.checked,
                showTorqueVector: form.fieldShowTorqueVector.checked
            }
        };
    }

    setFieldEnabled() {
        const enabled = this.form.elements.fieldEnabled.checked;
        this.form.elements.fieldReferencePartId.required = enabled;
        this.form.elements.fieldRotationPartId.required = enabled;
        this.fieldValues.hidden = !enabled;
        if (enabled) this.fieldEditor.open(this.getFieldFormData());
        else {
            this.fieldEditor.root.hidden = true;
            this.fieldEditor.close();
        }
    }

    syncFieldEditor() {
        if (!this.form.elements.fieldEnabled.checked) return;
        this.fieldEditor.applyConfiguration(this.getFieldFormData());
    }

    setFieldPart(name, partId) {
        this.form.elements[name].value = partId;
        this.syncFieldEditor();
    }

    setFieldTransform(transform) {
        const form = this.form.elements;
        form.fieldPositionX.value = this.formatCoordinate(transform.position.x);
        form.fieldPositionY.value = this.formatCoordinate(transform.position.y);
        form.fieldPositionZ.value = this.formatCoordinate(transform.position.z);
        form.fieldTransformRotationX.value = this.formatCoordinate(transform.rotation.x);
        form.fieldTransformRotationY.value = this.formatCoordinate(transform.rotation.y);
        form.fieldTransformRotationZ.value = this.formatCoordinate(transform.rotation.z);
        form.fieldScaleX.value = this.formatCoordinate(transform.scale.x);
        form.fieldScaleY.value = this.formatCoordinate(transform.scale.y);
        form.fieldScaleZ.value = this.formatCoordinate(transform.scale.z);
    }

    async save(event) {
        event.preventDefault();
        if (!this.form.reportValidity()) return;

        this.setBusy(true);
        try {
            const selectedModel = this.modelFileInput.files[0];
            if (selectedModel) {
                await this.uploadSelectedModel();
                const resource = await this.validateModel(this.form.elements.modelPath.value);
                this.validateModelConfiguration(
                    resource,
                    this.getFieldFormData(),
                    this.form.elements.behaviorType.value
                );
            }
            const thumbnailFile = this.thumbnailFileInput.files[0];
            if (thumbnailFile) {
                this.setStatus('Отпремање thumbnail слике…');
                const upload = await this.api.uploadThumbnail(thumbnailFile);
                this.form.elements.thumbnailPath.value = upload.thumbnailPath;
                this.setThumbnailPreview(upload.thumbnailPath);
                this.thumbnailFileInput.value = '';
            }
            const data = this.getFormData();
            if (this.editingId) {
                await this.api.updateExhibit(this.editingId, data);
            } else {
                await this.api.createExhibit(data);
            }
            this.closeForm();
            await this.afterChange('Експонат је сачуван.');
        } catch (error) {
            this.setStatus(error.message, true);
        } finally {
            this.setBusy(false);
        }
    }

    selectModel() {
        const file = this.modelFileInput.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.glb') || file.size > 100 * 1024 * 1024) {
            this.modelFileInput.value = '';
            this.setStatus('Модел мора бити GLB 2.0 фајл до 100 MB.', true);
            return;
        }

        this.modelFileName.textContent = `Изабран фајл: ${file.name}`;
        this.setStatus('Модел је изабран. Кликните „Отпреми и провери“.');
    }

    removeModel() {
        this.modelFileInput.value = '';
        this.form.elements.modelPath.value = '';
        this.modelFileName.textContent = 'Модел није изабран.';
    }

    setModelPath(path) {
        this.modelFileInput.value = '';
        this.form.elements.modelPath.value = path || '';
        this.modelFileName.textContent = path
            ? `Сачуван модел: ${path.split('/').pop()}`
            : 'Модел није изабран.';
    }

    async uploadSelectedModel() {
        const file = this.modelFileInput.files[0];
        if (!file) return this.form.elements.modelPath.value.trim();

        this.setStatus('Отпремање GLB модела…');
        const upload = await this.api.uploadModel(file);
        this.setModelPath(upload.modelPath);
        return upload.modelPath;
    }

    setBehaviorDefaults() {
        const behaviorType = this.form.elements.behaviorType.value;
        if (behaviorType === 'three-phase-motor') {
            this.form.elements.fieldPhaseCount.value = 3;
            this.form.elements.fieldCoilCount.value = 6;
        }
        if (behaviorType === 'two-phase-motor') {
            this.form.elements.fieldPhaseCount.value = 2;
            this.form.elements.fieldCoilCount.value = 8;
        }
        this.syncFieldEditor();
    }

    selectThumbnail() {
        const file = this.thumbnailFileInput.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            this.thumbnailFileInput.value = '';
            this.setStatus('Thumbnail мора бити JPEG, PNG или WebP слика до 5 MB.', true);
            return;
        }

        this.clearThumbnailObjectUrl();
        this.thumbnailObjectUrl = URL.createObjectURL(file);
        this.thumbnailImage.src = this.thumbnailObjectUrl;
        this.thumbnailPreview.hidden = false;
    }

    removeThumbnail() {
        this.clearThumbnailObjectUrl();
        this.thumbnailFileInput.value = '';
        this.form.elements.thumbnailPath.value = '';
        this.thumbnailImage.removeAttribute('src');
        this.thumbnailPreview.hidden = true;
    }

    setThumbnailPreview(path) {
        this.clearThumbnailObjectUrl();
        this.form.elements.thumbnailPath.value = path || '';
        if (path) this.thumbnailImage.src = this.api.resolveAssetUrl(path);
        else this.thumbnailImage.removeAttribute('src');
        this.thumbnailPreview.hidden = !path;
    }

    clearThumbnailObjectUrl() {
        if (!this.thumbnailObjectUrl) return;
        URL.revokeObjectURL(this.thumbnailObjectUrl);
        this.thumbnailObjectUrl = null;
    }

    async toggleAvailability(exhibit) {
        this.setStatus(exhibit.isAvailable ? 'Повлачење из каталога…' : 'Објављивање…');
        try {
            if (!exhibit.isAvailable) {
                if (!exhibit.modelPath || !exhibit.field) {
                    throw new Error('За објављивање су потребни GLB модел и подешавање поља.');
                }
                const resource = await this.validateModel(exhibit.modelPath);
                this.validateModelConfiguration(resource, exhibit.field, exhibit.behaviorType);
            }
            await this.api.setExhibitAvailability(exhibit.id, !exhibit.isAvailable);
            await this.afterChange(exhibit.isAvailable ? 'Експонат је повучен из каталога.' : 'Експонат је објављен.');
        } catch (error) {
            this.setStatus(error.message, true);
        }
    }

    async delete(exhibit) {
        if (!window.confirm(`Обрисати експонат „${exhibit.title}“?`)) return;

        this.setStatus('Брисање…');
        try {
            await this.api.deleteExhibit(exhibit.id);
            if (this.editingId === exhibit.id) this.closeForm();
            await this.afterChange('Експонат је обрисан.');
        } catch (error) {
            this.setStatus(error.message, true);
        }
    }

    async loadHotspots(exhibitId = this.editingId) {
        if (!exhibitId) return;

        this.setStatus('Учитавање hotspot-ова…');
        try {
            const hotspots = await this.api.getAdminHotspots(exhibitId);
            if (this.editingId !== exhibitId) return;
            this.hotspots = hotspots;
            this.renderHotspots();
            this.setStatus(hotspots.length ? '' : 'Овај експонат још нема hotspot-ове.');
        } catch (error) {
            if (this.editingId === exhibitId) this.setStatus(error.message, true);
        }
    }

    renderHotspots() {
        this.hotspotList.replaceChildren();

        this.hotspots.forEach((hotspot) => {
            const item = document.createElement('article');
            const copy = document.createElement('div');
            const title = document.createElement('h3');
            const metadata = document.createElement('p');
            const actions = document.createElement('div');
            const editButton = this.createButton('Измени', 'admin-secondary');
            const deleteButton = this.createButton('Обриши', 'admin-danger');

            item.className = 'admin-hotspot-item';
            copy.className = 'admin-list-copy';
            actions.className = 'admin-list-actions';
            title.textContent = hotspot.title;
            metadata.textContent = `${hotspot.key} · ${hotspot.targetPartIds.length} glow делова · ${hotspot.isEnabled ? 'Укључен' : 'Искључен'}`;
            editButton.addEventListener('click', () => this.openHotspotForm(hotspot));
            deleteButton.addEventListener('click', () => this.deleteHotspot(hotspot));
            copy.append(title, metadata);
            actions.append(editButton, deleteButton);
            item.append(copy, actions);
            this.hotspotList.appendChild(item);
        });
    }

    openHotspotForm(hotspot = null) {
        this.hotspotEditingId = hotspot?.id || null;
        this.hotspotForm.reset();
        this.hotspotForm.elements.id.value = this.hotspotEditingId || '';
        this.hotspotFormTitle.textContent = hotspot ? 'Измена hotspot-а' : 'Нови hotspot';
        this.hotspotSubmitButton.textContent = hotspot ? 'Сачувај измене' : 'Сачувај hotspot';

        if (hotspot) {
            this.hotspotForm.elements.title.value = hotspot.title;
            this.hotspotForm.elements.key.value = hotspot.key;
            this.hotspotForm.elements.description.value = hotspot.description;
            this.hotspotForm.elements.anchorPartId.value = hotspot.anchorPartId;
            this.hotspotForm.elements.positionX.value = hotspot.localPosition.x;
            this.hotspotForm.elements.positionY.value = hotspot.localPosition.y;
            this.hotspotForm.elements.positionZ.value = hotspot.localPosition.z;
            this.hotspotForm.elements.displayOrder.value = hotspot.displayOrder;
            this.hotspotForm.elements.targetPartIds.value = hotspot.targetPartIds.join('\n');
            this.hotspotForm.elements.isEnabled.checked = hotspot.isEnabled;
        } else {
            this.hotspotForm.elements.displayOrder.value = this.hotspots.length;
            this.hotspotForm.elements.isEnabled.checked = true;
        }

        this.hotspotForm.hidden = false;
        this.hotspotForm.elements.title.focus();
        this.setStatus('');
        this.modelEditor.open({
            anchorPartId: hotspot?.anchorPartId,
            localPosition: hotspot?.localPosition,
            targetPartIds: hotspot?.targetPartIds || []
        });
    }

    closeHotspotForm() {
        this.hotspotEditingId = null;
        this.hotspotForm.hidden = true;
        this.hotspotForm.reset();
        this.modelEditor.close();
    }

    setAnchorFromModel(partId, position) {
        this.hotspotForm.elements.anchorPartId.value = partId;
        this.hotspotForm.elements.positionX.value = this.formatCoordinate(position.x);
        this.hotspotForm.elements.positionY.value = this.formatCoordinate(position.y);
        this.hotspotForm.elements.positionZ.value = this.formatCoordinate(position.z);
    }

    setTargetsFromModel(partIds) {
        this.hotspotForm.elements.targetPartIds.value = partIds.join('\n');
    }

    formatCoordinate(value) {
        return Number(value.toFixed(6));
    }

    syncModelSelection() {
        const form = this.hotspotForm.elements;
        const coordinates = [form.positionX.value, form.positionY.value, form.positionZ.value];
        const hasPosition = coordinates.every((value) => value !== '' && Number.isFinite(Number(value)));
        const targetPartIds = [...new Set(
            form.targetPartIds.value.split(/[\n,]+/).map((partId) => partId.trim()).filter(Boolean)
        )];

        this.modelEditor.applySelection({
            anchorPartId: form.anchorPartId.value.trim() || null,
            localPosition: hasPosition ? {
                x: Number(coordinates[0]),
                y: Number(coordinates[1]),
                z: Number(coordinates[2])
            } : null,
            targetPartIds
        });
    }

    getHotspotFormData() {
        const data = new FormData(this.hotspotForm);
        const targetPartIds = [...new Set(
            data.get('targetPartIds')
                .split(/[\n,]+/)
                .map((partId) => partId.trim())
                .filter(Boolean)
        )];

        return {
            key: data.get('key').trim(),
            title: data.get('title').trim(),
            description: data.get('description').trim(),
            anchorPartId: data.get('anchorPartId').trim(),
            localPosition: {
                x: Number(data.get('positionX')),
                y: Number(data.get('positionY')),
                z: Number(data.get('positionZ'))
            },
            targetPartIds,
            isEnabled: data.get('isEnabled') === 'on',
            displayOrder: Number(data.get('displayOrder'))
        };
    }

    async saveHotspot(event) {
        event.preventDefault();
        if (!this.hotspotForm.reportValidity() || !this.editingId) return;

        const data = this.getHotspotFormData();
        if (!data.targetPartIds.length) {
            this.setStatus('Унесите бар један glow target museumPartId.', true);
            return;
        }

        this.setHotspotBusy(true);
        try {
            if (this.hotspotEditingId) {
                await this.api.updateHotspot(this.editingId, this.hotspotEditingId, data);
            } else {
                await this.api.createHotspot(this.editingId, data);
            }
            this.closeHotspotForm();
            await this.loadHotspots();
            this.setStatus('Hotspot је сачуван.');
        } catch (error) {
            this.setStatus(error.message, true);
        } finally {
            this.setHotspotBusy(false);
        }
    }

    async deleteHotspot(hotspot) {
        if (!window.confirm(`Обрисати hotspot „${hotspot.title}“?`)) return;

        this.setStatus('Брисање hotspot-а…');
        try {
            await this.api.deleteHotspot(this.editingId, hotspot.id);
            if (this.hotspotEditingId === hotspot.id) this.closeHotspotForm();
            await this.loadHotspots();
            this.setStatus('Hotspot је обрисан.');
        } catch (error) {
            this.setStatus(error.message, true);
        }
    }

    setHotspotBusy(value) {
        Array.from(this.hotspotForm.elements).forEach((element) => element.disabled = value);
    }

    async validateModelPath() {
        try {
            const path = await this.uploadSelectedModel();
            if (!path) {
                this.setStatus('Изаберите GLB модел.', true);
                return;
            }

            this.setStatus('Провера модела…');
            const resource = await this.validateModel(path);
            const field = this.getFieldFormData();
            const partCount = this.validateModelConfiguration(
                resource,
                field,
                this.form.elements.behaviorType.value
            );
            if (this.form.elements.fieldEnabled.checked) {
                this.fieldEditor.configuration = this.getFieldFormData();
                await this.fieldEditor.load();
            }
            this.setStatus(`GLB је исправан. Пронађено museumPartId вредности: ${partCount}.`);
        } catch (error) {
            this.setStatus(error.message || 'Модел није могуће учитати.', true);
        }
    }

    validateModelConfiguration(resource, field, behaviorType) {
        const registry = new ModelPartRegistry(resource.scene);
        const isRotatingMotor = behaviorType === 'two-phase-motor' || behaviorType === 'three-phase-motor';

        if (isRotatingMotor && resource.animations.length === 0) {
            throw new Error('Модел мотора мора да садржи бар једну анимацију.');
        }

        if (isRotatingMotor && field) {
            const requiredPhaseCount = behaviorType === 'three-phase-motor' ? 3 : 2;
            if (field.profile !== 'rotating-field') {
                throw new Error('Мотор мора да користи профил „Обртно магнетно поље“.');
            }
            if (field.engineering.phaseCount !== requiredPhaseCount) {
                throw new Error(`Изабрани мотор мора да има број фаза ${requiredPhaseCount}.`);
            }
        }

        if (field) {
            if (registry.parts.size === 0) {
                throw new Error('GLB нема ниједан museumPartId. Додајте их у Blender-у пре подешавања поља и hotspot-ова.');
            }
            registry.getRequired(field.referencePartId);
            registry.getRequired(field.rotationPartId);
        }

        return registry.parts.size;
    }

    async afterChange(message) {
        await this.load();
        await this.onCatalogChanged();
        this.setStatus(message);
    }

    setBusy(value) {
        Array.from(this.form.elements).forEach((element) => element.disabled = value);
    }

    setStatus(message, isError = false) {
        this.status.textContent = message;
        this.status.classList.toggle('is-error', isError);
    }
}
