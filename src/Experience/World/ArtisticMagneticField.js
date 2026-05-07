import * as THREE from 'three';
import Experience from "../Experience.js";

export default class ArtisticMagneticField{
    constructor(generator){
        this.Experience = new Experience();
        this.scene = this.Experience.scene;
        this.generator = generator;
        this.magneticFieldObject = this.generator.magneticFieldObject;
        this.magneticFieldRotationObject = this.generator.magneticFieldRotationObject;
        this.time = this.Experience.time;
        this.setMesh();
        this.setOuterShell();
    }
    
    setGeometry(){
        this.baseGeometry = new THREE.CylinderGeometry(
            2.75,   // top radius
            2.75,   // bottom radius
            3.0,   // height
            128,   // radial segments (bitno za smooth wave kasnije)
            64,    // height segments (bitno za noise kasnije)
            true   // open ended (ZA SAD ostavljamo otvoren)
        );

        this.geometry = this.baseGeometry.clone();
    }

    setMaterial() {

        this.material = new THREE.ShaderMaterial({

            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,

            uniforms: {
                uTime: { value: 0 },
                uAmplitude: { value: 0.15 },
                uFrequency: { value: 6.0 },
                uRotorAngle: { value: -Math.PI / 4 },
                uAngularVelocity: { value: 0 }
            },

            vertexShader: `
                uniform float uTime;
                uniform float uAmplitude;
                uniform float uFrequency;
                uniform float uRotorAngle;
                uniform float uAngularVelocity;

                varying float vWave;
                varying float vHeight;
                varying float vTheta;
                varying float vY;

                void main() {

                    vec3 pos = position;

                    float theta = atan(pos.z, pos.x);
                    float y = pos.y * 2.0;

                    // 🧲 DIPOL (rotacija + stabilnost)
                    float heightFactor = cos(theta + uRotorAngle + 0.52);
                    vHeight = heightFactor * 0.5 + 0.5;

                    // 🌊 BASE WAVE
                    float baseWave =
                        sin(theta * 4.0 + y + uTime * 1.5)
                        * 0.05;

                    float rotorWave =
                        sin(theta * uFrequency + y * 1.5 + uRotorAngle * 4.0 + uAngularVelocity * 2.0)
                        * uAmplitude;

                    // 🧲 jačina magnetnog polja
                    float fieldStrength = abs(heightFactor);

                    // blago pojačanje da nikad ne bude potpuno mirno
                    fieldStrength = mix(0.35, 1.0, fieldStrength);

                    // final wave
                    float wave = (baseWave + rotorWave) * fieldStrength;

                    vec3 displaced = normal * wave;

                    vWave = wave;
                    vTheta = theta;
                    vY = y;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + displaced, 1.0);
                }
            `,

            fragmentShader: `
                uniform float uTime;
                uniform float uRotorAngle;

                varying float vWave;
                varying float vHeight;
                varying float vTheta;
                varying float vY;

                void main() {

                    // 🧠 stabilizacija i redistribucija (kraći polovi)
                    float h = vHeight;
                    h = smoothstep(0.0, 1.0, h);

                    // 🔥 zgušnjavanje sredine, skraćivanje krajeva
                    h = pow(h, 0.85);

                    // 🌈 MAGNETNI SPEKTRUM (balansirane zone)

                    vec3 color;
                    float flow =
                        sin(
                            vTheta * 18.0
                            + vY * 2.5
                            - uTime * 6.0
                            + uRotorAngle * 3.0
                        );

                    // tanke linije
                    // 🧲 koncentracija oko polova
                    float poleMask = pow(abs(vHeight - 0.5) * 2.0, 2.5);

                    // 🌪 spiral distortion
                    float spiral =
                        sin(vTheta * 2.0 + vY * 1.5 + uTime * 2.0) * 0.15;

                    flow *= poleMask + spiral;

                    // pojačanje kod polova
                    flow *= pow(abs(vHeight - 0.5) * 2.0, 1.5);
                    if (h < 0.15) {
                        color = mix(
                            vec3(0.2, 0.6, 1.0),   // blue
                            vec3(0.2, 1.0, 0.9),   // cyan
                            h / 0.15
                        );
                    }
                    else if (h < 0.45) {
                        color = mix(
                            vec3(0.2, 1.0, 0.9),   // cyan
                            vec3(0.2, 1.0, 0.3),   // green
                            (h - 0.15) / 0.30
                        );
                    }
                    else if (h < 0.75) {
                        color = mix(
                            vec3(0.2, 1.0, 0.3),   // green
                            vec3(1.0, 0.9, 0.2),   // yellow
                            (h - 0.45) / 0.30
                        );
                    }
                    else {
                        color = mix(
                            vec3(1.0, 0.9, 0.2),   // yellow
                            vec3(1.0, 0.2, 0.3),   // red
                            (h - 0.75) / 0.25
                        );
                    }

                    // 🌊 wave energy overlay
                    color += abs(vWave) * 0.12 * vec3(0.2, 0.3, 0.4);
                    // ⚡ energy flow glow
                    color += flow * vec3(0.8, 0.95, 1.0) * 0.35;
                    gl_FragColor = vec4(color, 0.4);
                }
            `
        });
    }
    setOuterShell() {

        this.outerGeometry = new THREE.CylinderGeometry(
            2.95,
            2.95,
            3.25,
            128,
            64,
            true
        );

        this.outerMaterial = new THREE.ShaderMaterial({

            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,

            blending: THREE.AdditiveBlending,

            uniforms: {
                uTime: { value: 0 },
                uRotorAngle: { value: 0 }
            },

            vertexShader: `

                uniform float uTime;
                uniform float uRotorAngle;

                varying float vFresnel;
                varying float vHeight;

                void main() {

                    vec3 pos = position;

                    float theta = atan(pos.z, pos.x);

                    // 🌊 atmospheric wave
                    float wave =
                        sin(theta * 3.0 + pos.y * 1.5 + uTime * 0.8)
                        * 0.04;

                    pos += normal * wave;

                    // 🔥 fresnel
                    vec3 mvPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;

                    vec3 worldNormal = normalize(normalMatrix * normal);
                    vec3 viewDir = normalize(-mvPosition);

                    vFresnel = pow(
                        1.0 - max(dot(worldNormal, viewDir), 0.0),
                        2.5
                    );

                    // 🧲 rotating dipole
                    float h = cos(theta + uRotorAngle + 0.52);

                    vHeight = h * 0.5 + 0.5;

                    gl_Position =
                        projectionMatrix *
                        vec4(mvPosition, 1.0);
                }
            `,

            fragmentShader: `

                varying float vFresnel;
                varying float vHeight;

                void main() {

                    vec3 blue   = vec3(0.2, 0.6, 1.0);
                    vec3 cyan   = vec3(0.2, 1.0, 0.9);
                    vec3 green  = vec3(0.2, 1.0, 0.3);
                    vec3 yellow = vec3(1.0, 0.9, 0.2);
                    vec3 red    = vec3(1.0, 0.2, 0.3);

                    float h = smoothstep(0.0, 1.0, vHeight);

                    vec3 color;

                    if (h < 0.15) {
                        color = mix(blue, cyan, h / 0.15);
                    }
                    else if (h < 0.45) {
                        color = mix(cyan, green, (h - 0.15) / 0.30);
                    }
                    else if (h < 0.75) {
                        color = mix(green, yellow, (h - 0.45) / 0.30);
                    }
                    else {
                        color = mix(yellow, red, (h - 0.75) / 0.25);
                    }

                    // 🌫 atmospheric fresnel glow
                    float alpha = vFresnel * 0.22;

                    gl_FragColor = vec4(color, alpha);
                }
            `
        });

        this.outerMesh = new THREE.Mesh(
            this.outerGeometry,
            this.outerMaterial
        );

        this.outerMesh.position.copy(
            this.mesh.position
        );

        this.outerMesh.rotation.copy(
            this.mesh.rotation
        );

        this.scene.add(this.outerMesh);
    }
    setMesh(){
        this.setGeometry();
        this.setMaterial();
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.position.copy(
            this.magneticFieldObject.getWorldPosition(new THREE.Vector3())
        );
        this.mesh.rotation.x = Math.PI / 2; // Postavi rotaciju da bude horizontalna
        this.scene.add(this.mesh);
    }
    normalizeAngleDelta(current, previous) {
        let delta = current - previous;

        const TWO_PI = Math.PI * 2;

        delta = (delta + Math.PI) % TWO_PI - Math.PI;

        return delta;
    }
    update() {

        const speedFactor = 1.05;

        const currentAngle = this.magneticFieldRotationObject.rotation.z;

        // 🧠 init
        if (this.previousAngle === undefined) {
            this.previousAngle = currentAngle;
        }

        if (this.smoothAngle === undefined) {
            this.smoothAngle = currentAngle;
        }

        // 🔁 delta sa wrap korekcijom
        let delta = this.normalizeAngleDelta(currentAngle, this.previousAngle);

        this.previousAngle = currentAngle;

        // ⚡ kontinuirana faza (GLAVNI FIX)
        this.smoothAngle += delta;

        // 🔥 uniform update
        this.material.uniforms.uTime.value = this.time.elapsed * 0.001;

        this.material.uniforms.uRotorAngle.value =
            this.smoothAngle * speedFactor;
        this.outerMaterial.uniforms.uTime.value =
        this.time.elapsed * 0.001;

        this.outerMaterial.uniforms.uRotorAngle.value =
        this.smoothAngle * speedFactor;
    }
}