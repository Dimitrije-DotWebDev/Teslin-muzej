export default class ExhibitApi {
    constructor(baseUrl = 'http://localhost:5095/api') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    getCatalog() {
        return this.get('/exhibits');
    }

    getExhibit(id) {
        return this.get('/exhibits/' + encodeURIComponent(id));
    }

    getAdminExhibits() {
        return this.get('/admin/exhibits');
    }

    createExhibit(exhibit) {
        return this.request('/admin/exhibits', { method: 'POST', body: exhibit });
    }

    updateExhibit(id, exhibit) {
        return this.request('/admin/exhibits/' + encodeURIComponent(id), { method: 'PUT', body: exhibit });
    }

    uploadThumbnail(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('/admin/exhibits/thumbnail', { method: 'POST', formData });
    }

    uploadModel(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('/admin/exhibits/model', { method: 'POST', formData });
    }

    resolveAssetUrl(path) {
        if (!path?.startsWith('/uploads/')) return path;
        return new URL(path, new URL(this.baseUrl, window.location.origin).origin).href;
    }

    deleteExhibit(id) {
        return this.request('/admin/exhibits/' + encodeURIComponent(id), { method: 'DELETE' });
    }

    setExhibitAvailability(id, isAvailable) {
        return this.request('/admin/exhibits/' + encodeURIComponent(id) + '/availability', {
            method: 'PATCH',
            body: { isAvailable }
        });
    }

    getAdminHotspots(exhibitId) {
        return this.get('/admin/exhibits/' + encodeURIComponent(exhibitId) + '/hotspots');
    }

    createHotspot(exhibitId, hotspot) {
        return this.request('/admin/exhibits/' + encodeURIComponent(exhibitId) + '/hotspots', {
            method: 'POST',
            body: hotspot
        });
    }

    updateHotspot(exhibitId, hotspotId, hotspot) {
        return this.request(
            '/admin/exhibits/' + encodeURIComponent(exhibitId) + '/hotspots/' + encodeURIComponent(hotspotId),
            { method: 'PUT', body: hotspot }
        );
    }

    deleteHotspot(exhibitId, hotspotId) {
        return this.request(
            '/admin/exhibits/' + encodeURIComponent(exhibitId) + '/hotspots/' + encodeURIComponent(hotspotId),
            { method: 'DELETE' }
        );
    }

    async get(path) {
        return this.request(path);
    }

    async request(path, options = {}) {
        const response = await fetch(this.baseUrl + path, {
            method: options.method || 'GET',
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            body: options.formData || (options.body ? JSON.stringify(options.body) : undefined)
        });

        if (!response.ok) {
            const problem = await response.json().catch(() => null);
            throw new Error(problem?.detail || problem?.title || 'API request failed with status ' + response.status + '.');
        }

        return response.status === 204 ? null : response.json();
    }
}
