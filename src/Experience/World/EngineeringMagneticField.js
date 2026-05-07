import * as THREE from 'three';
import Experience from "../Experience.js";

export default class EngineeringMagneticField{
    constructor(generator){
        this.Experience = new Experience();
        this.scene = this.Experience.scene;

        this.generator = generator;
        this.magneticFieldObject = this.generator.magneticFieldObject;
        this.magneticFieldRotationObject = this.generator.magneticFieldRotationObject;

        this.virtualMagnet = null;

        this.coils = [];
        this.coilCount = 8;
        this.coilRadius = 1.6;
        this.rotorAngle = 0;
        this.rotorVelocity = 0;
        this.fieldAngle = 0;

        this.backEMF = 0;
        this.emfStrength = 0.12;

        this.createCoils();

        this.setEngineeringRoot();
        this.setVirtualMagnet();
        this.setFieldShader();
        this.setTorqueDebug();
    }
    setTorqueDebug() {

        const geometry = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            2,
            0xff3b3b
        );

        this.torqueArrow = geometry;
        this.engineeringRoot.add(this.torqueArrow);
    }
    getRotatingFieldVector() {

        return new THREE.Vector2(
            Math.cos(this.fieldAngle),
            Math.sin(this.fieldAngle)
        );
    }
    getGeneratorAngle() {

        return this.magneticFieldRotationObject.rotation.z;
    }
    setEngineeringRoot(){
        this.engineeringRoot = new THREE.Group();
        this.scene.add(this.engineeringRoot);
    }
    createCoils() {

        for (let i = 0; i < this.coilCount; i++) {

            const angle = (i / this.coilCount) * Math.PI * 2;

            this.coils.push({
                index: i,
                angle,
                position: new THREE.Vector3(
                    Math.cos(angle) * this.coilRadius,
                    Math.sin(angle) * this.coilRadius,
                    0
                ),
            });
        }
    }
    setVirtualMagnet() {

        const group = new THREE.Group();

        const geometry = new THREE.BoxGeometry(1, 2.5, 4.5);

        // NORTH (plava)
        const northMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#2f7dff'),
            emissive: new THREE.Color('#2f7dff'),
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.35,
            depthTest: false,
        });

        // SOUTH (crvena)
        const southMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#ff3b3b'),
            emissive: new THREE.Color('#ff3b3b'),
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.35,
            depthTest: false,
        });

        const north = new THREE.Mesh(geometry, northMat);
        const south = new THREE.Mesh(geometry, southMat);

        // split po Y osi
        north.scale.z = 0.5;
        south.scale.z = 0.5;

        north.position.z = 0.625;
        south.position.z = -0.625;

        group.add(north);
        group.add(south);

        group.position.copy(
            this.magneticFieldObject.getWorldPosition(new THREE.Vector3())
        );

        group.rotation.x = Math.PI / 2;

        this.virtualMagnet = group;

        this.engineeringRoot.add(this.virtualMagnet);
    }
    setFieldShader() {

        const geometry = new THREE.PlaneGeometry(8, 8, 1, 1);
        const coilPositions = [];

        this.coils.forEach((coil) => {

            coilPositions.push(
                new THREE.Vector2(
                    coil.position.x,
                    coil.position.y
                )
            );
        });
        const coilPhases = [];

        this.coils.forEach((coil, i) => {

            // A B A B ...
            coilPhases.push(i % 2);
        });
       this.fieldUniforms = {

            uTime: { value: 0 },

            uColorA: {
                value: new THREE.Color('#3aa0ff')
            },

            uColorB: {
                value: new THREE.Color('#ff3b3b')
            },

            uCoils: {
                value: coilPositions
            },
            uPhaseType: {
                value: coilPhases
            },
            uCoilRadius: { value: this.coilRadius }
        };

        const material = new THREE.ShaderMaterial({

            uniforms: this.fieldUniforms,

            transparent: true,
            depthWrite: false,
            depthTest: false,

            blending: THREE.AdditiveBlending,

            side: THREE.DoubleSide,

            vertexShader: `
                varying vec2 vUv;

                void main() {

                    vUv = uv;

                    gl_Position = projectionMatrix *
                                modelViewMatrix *
                                vec4(position, 1.0);
                }
            `,

            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                uniform vec2 uCoils[8];
                uniform int uPhaseType[8];
                uniform float uCoilRadius;
                varying vec2 vUv;

                void main() {

                    vec2 uv = vUv;

                    vec2 centered = uv - 0.5;

                    float radius = length(centered);

                    float field = 0.0;

                    // mnogo vidljivije trake
                    vec2 rotatingField = vec2(
                        cos(uTime * 2.0),
                        sin(uTime * 2.0)
                    );
                    vec3 sectorAccum = vec3(0.0);
                    for(int i = 0; i < 8; i++) {

                        vec2 coil = uCoils[i] / 6.0;

                        vec2 toPixel = centered - coil;

                        float dist = length(toPixel);

                        vec2 dir = normalize(toPixel);

                        // 2-phase system
                        float phaseCurrent = 0.0;

                        if(uPhaseType[i] == 0) {

                            phaseCurrent = sin(uTime * 2.0);

                        } else {

                            phaseCurrent = cos(uTime * 2.0);
                        }

                        // directional magnetic projection
                        float directionalStrength =
                            dot(dir, rotatingField);

                        // field falloff
                        float influence =
                            phaseCurrent
                            * directionalStrength
                            / (dist * 8.0 + 0.15);

                        float localIntensity = abs(phaseCurrent);

                        float coilGlow =
                            smoothstep(0.35, 0.0, dist)
                            * localIntensity;

                        field += influence * 0.11*0.5;

                        field += coilGlow * 0.18 * 0.25;
                        // =========================
                        // ACTIVE COIL VISUALIZATION
                        // =========================

                        float sectorMask =
                            smoothstep(0.22, 0.0, dist);

                        float northSouth =
                            sign(phaseCurrent);

                        vec3 sectorColor =
                            mix(
                                vec3(1.0, 0.2, 0.2), // south
                                vec3(0.2, 0.5, 1.0), // north
                                step(0.0, northSouth)
                            );
                        sectorAccum += sectorColor * sectorMask * abs(phaseCurrent) * 0.45;
                        field += sectorMask * 0.08;
                    }

                    // animated pulse

                    field = abs(field);

                    field = pow(field, 1.4);

                    field = smoothstep(0.02, 0.35, field);

                    vec3 cold = vec3(0.1, 0.5, 1.0);
                    vec3 hot  = vec3(1.0, 0.2, 0.2);

                    vec3 color = mix(cold, hot, field);

                    // sector energy overlay
                    color += sectorAccum;
                    // 🔥 mnogo jača vidljivost
                    float alpha = field * 0.9;

                    gl_FragColor = vec4(color, alpha);
                }
            `
        });

        // 🔥 OVO TI JE FALILO
        this.fieldShader = new THREE.Mesh(geometry, material);

        // centriranje
        this.fieldShader.position.copy(
            this.magneticFieldObject.getWorldPosition(
                new THREE.Vector3()
            )
        );

        // 🔥 rotor ti je u XY ravni
        this.fieldShader.rotation.x = 0;

        this.engineeringRoot.add(this.fieldShader);
    }
    updateFieldAngle() {

        this.fieldAngle = this.getGeneratorAngle();
    }
    
    updateFieldShader() {

        if (!this.fieldUniforms) return;

        this.fieldUniforms.uTime.value = this.fieldAngle;
    }
    updateRotorCoupling() {

        if (!this.virtualMagnet) return;

        const field =
            this.getRotatingFieldVector();

        // target angle from EM field
        const targetAngle =
            Math.atan2(field.y, field.x);

        // shortest angular difference
        let delta =
            targetAngle - this.rotorAngle;

        while(delta > Math.PI)
            delta -= Math.PI * 2;

        while(delta < -Math.PI)
            delta += Math.PI * 2;

        // electromagnetic torque
        const torque = delta * 0.08;
        
        const fieldDir = this.getRotatingFieldVector();

        // rotor forward direction
        const rotorDir = new THREE.Vector2(
            Math.cos(this.rotorAngle),
            Math.sin(this.rotorAngle)
        );

        // torque = cross-like 2D
        const torqueSign =
            rotorDir.x * fieldDir.y -
            rotorDir.y * fieldDir.x;


        // inertia
        this.rotorVelocity += torque;
        this.torqueArrow.setDirection(
            new THREE.Vector3(
                fieldDir.x,
                fieldDir.y,
                0
            )
        );

        this.torqueArrow.position.copy(
            this.virtualMagnet.position
        );

        const fieldSpeed = this.fieldAngle; // stator speed
        const rotorSpeed = this.rotorVelocity;

        // relative motion (ključ)
        const slip = fieldSpeed - rotorSpeed;
        this.backEMF = slip * this.emfStrength;

        // damping
        this.rotorVelocity *= (0.94 - Math.abs(this.backEMF) * 0.15);

        // integrate
        this.rotorAngle += this.rotorVelocity;
        // clamp stability (prevents explosion)
        this.rotorVelocity = THREE.MathUtils.clamp(
            this.rotorVelocity,
            -0.25,
            0.25
        );
        // apply to rotor
        this.virtualMagnet.rotation.y = this.rotorAngle;
    }
    update(){

        // 1. read generator rotation
        this.updateFieldAngle();

        // 2. shader reacts
        this.updateFieldShader();

        // 3. virtual magnet reacts
        this.updateRotorCoupling();
    }

}