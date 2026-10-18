export default class ModelPartRegistry {
    constructor(model) {
        this.parts = new Map();

        model.traverse(object => {
            const partId = object.userData?.museumPartId;

            if (partId === undefined) return;
            if (typeof partId !== 'string' || partId.trim().length === 0) {
                throw new Error(`Invalid museumPartId on object "${object.name}"`);
            }
            if (this.parts.has(partId)) {
                throw new Error(`Duplicate museumPartId: "${partId}"`);
            }

            this.parts.set(partId, object);
        });
    }

    getRequired(partId) {
        const part = this.parts.get(partId);

        if (!part) {
            throw new Error(`Unknown museumPartId: "${partId}"`);
        }

        return part;
    }

    getRequiredMany(partIds) {
        if (!Array.isArray(partIds) || partIds.length === 0) {
            throw new Error('A hotspot must contain at least one targetPartId');
        }

        return [...new Set(partIds)].map(partId => this.getRequired(partId));
    }
}
