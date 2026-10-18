import * as THREE from 'three';

export default class MagneticFieldContext {
    constructor(exhibit, config) {
        this.exhibit = exhibit;
        this.config = config;
        this.reference = exhibit.partRegistry.getRequired(config.referencePartId);
        this.rotationSource = exhibit.partRegistry.getRequired(config.rotationPartId);
        this.root = new THREE.Group();
        this.angle = THREE.MathUtils.degToRad(config.phaseOffsetDegrees);
        this.angularVelocity = 0;
        this.angularDelta = 0;
        this.exhibit.scene.add(this.root);
        this.updateTransform();
    }

    update() {
        this.updateTransform();
        const rawAngle = this.rotationSource.rotation[this.config.rotationAxis];
        const nextAngle = rawAngle * this.config.angleMultiplier
            + THREE.MathUtils.degToRad(this.config.phaseOffsetDegrees);

        if (this.previousAngle === undefined) {
            this.previousAngle = nextAngle;
            this.angle = nextAngle;
            return;
        }

        this.angularDelta = Math.atan2(
            Math.sin(nextAngle - this.previousAngle),
            Math.cos(nextAngle - this.previousAngle)
        );
        const deltaSeconds = Math.max(this.exhibit.time.delta * 0.001, 0.000001);
        this.angularVelocity = this.angularDelta / deltaSeconds;
        this.angle += this.angularDelta;
        this.previousAngle = nextAngle;
    }

    updateTransform() {
        const transform = this.config.transform;
        const modelQuaternion = this.exhibit.model.getWorldQuaternion(new THREE.Quaternion());
        const offset = new THREE.Vector3(
            transform.position.x,
            transform.position.y,
            transform.position.z
        ).applyQuaternion(modelQuaternion);

        this.reference.getWorldPosition(this.root.position);
        this.root.position.add(offset);

        const rotation = new THREE.Euler(
            THREE.MathUtils.degToRad(transform.rotation.x),
            THREE.MathUtils.degToRad(transform.rotation.y),
            THREE.MathUtils.degToRad(transform.rotation.z),
            'XYZ'
        );
        this.root.quaternion.copy(modelQuaternion).multiply(new THREE.Quaternion().setFromEuler(rotation));
        this.root.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }

    dispose() {
        this.root.removeFromParent();
    }
}
