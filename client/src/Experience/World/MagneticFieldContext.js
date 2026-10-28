import * as THREE from 'three';

export default class MagneticFieldContext {
    constructor(exhibit, config) {
        this.exhibit = exhibit;
        this.config = config;
        this.root = new THREE.Group();
        this.angle = THREE.MathUtils.degToRad(config.phaseOffsetDegrees);
        this.angularVelocity = 0;
        this.angularDelta = 0;
        this.rotationEnabled = true;
        this.modelQuaternion = new THREE.Quaternion();
        this.sourceQuaternion = new THREE.Quaternion();
        this.relativeQuaternion = new THREE.Quaternion();
        this.rotationDelta = new THREE.Quaternion();
        this.setSource(config.referencePartId, config.rotationPartId);
        this.exhibit.scene.add(this.root);
        this.updateTransform();
    }

    setSource(referencePartId, rotationPartId) {
        this.reference = this.exhibit.partRegistry.getRequired(referencePartId);
        this.rotationSource = this.exhibit.partRegistry.getRequired(rotationPartId);
        this.initialRotationInverse = this.getRelativeRotation().clone().invert();
        this.previousAngle = undefined;
        this.angularVelocity = 0;
        this.angularDelta = 0;
        this.updateTransform();
    }

    update() {
        this.updateTransform();
        // Read inherited rotation in model space, relative to the starting pose.
        // The rotor can be animated directly or through an Empty parent.
        this.rotationDelta.copy(this.getRelativeRotation()).multiply(this.initialRotationInverse);
        const rawAngle = 2 * Math.atan2(
            this.rotationDelta[this.config.rotationAxis],
            this.rotationDelta.w
        );

        if (!this.rotationEnabled) {
            this.previousAngle = rawAngle;
            this.angularDelta = 0;
            this.angularVelocity = 0;
            return;
        }

        if (this.previousAngle === undefined) {
            this.previousAngle = rawAngle;
            return;
        }

        this.angularDelta = Math.atan2(
            Math.sin(rawAngle - this.previousAngle),
            Math.cos(rawAngle - this.previousAngle)
        ) * this.config.angleMultiplier;
        const deltaSeconds = Math.max(this.exhibit.time.delta * 0.001, 0.000001);
        this.angularVelocity = this.angularDelta / deltaSeconds;
        this.angle += this.angularDelta;
        this.previousAngle = rawAngle;
    }

    getRelativeRotation() {
        this.exhibit.model.getWorldQuaternion(this.modelQuaternion);
        this.rotationSource.getWorldQuaternion(this.sourceQuaternion);
        return this.relativeQuaternion.copy(this.modelQuaternion).invert().multiply(this.sourceQuaternion);
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
