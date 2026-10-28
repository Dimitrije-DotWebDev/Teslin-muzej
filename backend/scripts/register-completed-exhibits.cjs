// Run from any directory with Node 18+: --check validates GLBs; --apply imports via admin API.
// Existing slugs are preserved, including hand-edited field placement and availability.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const api = (process.env.TESLA_MUSEUM_API_URL || 'http://localhost:5095/api').replace(/\/$/, '');
const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const field = (profile, referencePartId, rotationPartId, secondaryReferencePartId, secondaryRotationPartId) => ({
    profile, referencePartId, rotationPartId, secondaryReferencePartId, secondaryRotationPartId,
    transform: { position: vector(), rotation: vector(), scale: vector(1, 1, 1) },
    rotationAxis: 'z', angleMultiplier: 1, phaseOffsetDegrees: 0,
    engineering: { phaseCount: 2, coilCount: 4, polePairs: 1, showVirtualMagnet: true, showTorqueVector: true }
});
const symmetricField = field('rotating-field', 'rotor-motora-1-1', 'rotor-motora-1-1',
    'rotor-motora-2-1', 'rotor-motora-2-1');
symmetricField.transform.scale = vector(0.55, 0.55, 0.6);
const transformerField = field('alternating-core', 'okvir-transformatora', 'rotor-generatora-1', null, null);
transformerField.transform.rotation = vector(90, 0, 0);
transformerField.transform.scale = vector(1.3, 1.7, 0.3);
transformerField.engineering.showVirtualMagnet = false;
transformerField.engineering.showTorqueVector = false;

// Coordinates for hotspots are derived below from each anchor's local geometry bounds.
const hotspot = (key, title, description, ...parts) => ({
    key, title, description, anchorPartId: parts[0], targetPartIds: parts, isEnabled: true
});
const definitions = [
    {
        source: 'client/static/models/SymmetricalMotor/glb/Simetricni motor.glb',
        exhibit: {
            slug: 'symmetric-motor', title: 'Симетрични мотор', eyebrow: 'Две машине, заменљиве улоге',
            description: 'Два симетрична склопа могу да преузму улогу генератора и мотора. Изаберите генератор и посматрајте покретање другог мотора и обртно магнетно поље.',
            behaviorType: 'symmetric-motor', displayOrder: 4, thumbnailPath: null, field: symmetricField
        },
        clips: ['motor-1', 'motor-2', 'pokretanje-motora-1', 'pokretanje-motora-2'],
        hotspots: [
            hotspot('windings', 'Намотаји', 'Струје у намотајима стварају магнетно поље. Избор генератора одређује који склоп покреће други мотор.', 'namotaj-motora-1', 'namotaj-motora-2'),
            hotspot('rotor-one', 'Ротор првог мотора', 'Обртни део првог склопа. Његова улога зависи од изабраног генератора.', 'rotor-motora-1-1', 'rotor-motora-1-2'),
            hotspot('rotor-two', 'Ротор другог мотора', 'Обртни део другог склопа. При промени генератора мења се улога склопова.', 'rotor-motora-2-1', 'rotor-motora-2-2'),
            hotspot('stators', 'Непокретни делови', 'Непокретни магнетни склопови окружују роторе и усмеравају магнетни флукс.', 'stator-motora-1', 'stator-motora-2'),
            hotspot('conductors', 'Проводници', 'Проводници електрично повезују два склопа.', 'provodnik')
        ]
    },
    {
        source: 'client/static/models/Transformator/glb/Transformator.glb',
        exhibit: {
            slug: 'transformer', title: 'Трансформатор', eyebrow: 'Електромагнетна индукција',
            description: 'Променљиви магнетни флукс повезује намотаје трансформатора и индукује напон. Укључите систем и посматрајте приказ поља, сијалице и светлеће цеви.',
            behaviorType: 'transformer', displayOrder: 5, thumbnailPath: null, field: transformerField
        },
        clips: ['generator'],
        hotspots: [
            hotspot('windings', 'Намотаји трансформатора', 'Променљива струја ствара магнетни флукс који повезује намотаје и омогућава електромагнетну индукцију.', 'namotaji-transformatora'),
            hotspot('core', 'Језгро трансформатора', 'Магнетно језгро усмерава флукс који повезује намотаје.', 'okvir-transformatora'),
            hotspot('bulbs', 'Сијалице', 'Сијалице су потрошачи у приказаном колу. Њихово светљење прати укључивање и искључивање система.', ...Array.from({ length: 6 }, (_, i) => `sijalica_0${i + 1}`)),
            hotspot('tubes', 'Светлеће цеви', 'Светлеће цеви приказују деловање напајања на ове потрошаче.', ...Array.from({ length: 4 }, (_, i) => `cev_0${i + 1}`)),
            hotspot('generator', 'Ротор генератора', 'Обртање генератора обезбеђује извор променљивог напајања у овом приказу.', 'rotor-generatora-1', 'rotor-generatora-2')
        ]
    }
];

function prepare(definition) {
    const bytes = fs.readFileSync(path.join(root, definition.source));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const parts = new Map();
    for (const node of gltf.nodes) {
        const id = node.extras?.museumPartId;
        if (!id) continue;
        assert.ok(!parts.has(id), `Duplicate museumPartId: ${id}`);
        parts.set(id, node);
    }
    const config = definition.exhibit.field;
    for (const id of [config.referencePartId, config.rotationPartId, config.secondaryReferencePartId,
        config.secondaryRotationPartId].filter(Boolean)) assert.ok(parts.has(id), `Missing field part ${id}`);
    for (const name of definition.clips) assert.ok(gltf.animations?.some(clip => clip.name === name), `Missing animation ${name}`);
    const hotspots = definition.hotspots.map((item, displayOrder) => {
        for (const id of item.targetPartIds) assert.ok(parts.has(id), `Missing hotspot part ${id}`);
        const anchor = parts.get(item.anchorPartId);
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const primitive of gltf.meshes[anchor.mesh].primitives) {
            const bounds = gltf.accessors[primitive.attributes.POSITION];
            for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], bounds.min[axis]);
                max[axis] = Math.max(max[axis], bounds.max[axis]);
            }
        }
        const center = min.map((value, axis) => (value + max[axis]) / 2);
        assert.ok(center.every(Number.isFinite));
        return { ...item, displayOrder, localPosition: vector(...center) };
    });
    return { ...definition, bytes, hotspots };
}

async function request(route, options = {}) {
    const response = await fetch(api + route, { ...options, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${route}: ${response.status} ${await response.text()}`);
    return response.status === 204 ? null : response.json();
}
const jsonRequest = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function main() {
    // Validate both complete models before making any backend changes.
    const prepared = definitions.map(prepare);
    prepared.forEach(item => console.log(`Validated ${item.exhibit.slug}: ${item.hotspots.length} hotspots, ${item.clips.length} required clips.`));
    if (!process.argv.includes('--apply')) return;
    const catalog = await request('/admin/exhibits');
    for (const item of prepared) {
        if (catalog.some(exhibit => exhibit.slug === item.exhibit.slug)) {
            console.log(`Preserved existing ${item.exhibit.slug}.`);
            continue;
        }
        const form = new FormData();
        form.append('file', new Blob([item.bytes], { type: 'model/gltf-binary' }), path.basename(item.source));
        const upload = await request('/admin/exhibits/model', { method: 'POST', body: form });
        const exhibit = await request('/admin/exhibits', jsonRequest('POST', { ...item.exhibit, modelPath: upload.modelPath }));
        // Leave a new exhibit unavailable if any registration/validation step fails.
        for (const entry of item.hotspots) await request(`/admin/exhibits/${exhibit.id}/hotspots`, jsonRequest('POST', entry));
        const modelResponse = await fetch(new URL(upload.modelPath, api), { signal: AbortSignal.timeout(60000) });
        assert.ok(modelResponse.ok, 'Uploaded GLB must be served by backend');
        const uploaded = Buffer.from(await modelResponse.arrayBuffer());
        assert.equal(crypto.createHash('sha256').update(uploaded).digest('hex'),
            crypto.createHash('sha256').update(item.bytes).digest('hex'), 'Stored GLB must match source');
        await request(`/admin/exhibits/${exhibit.id}/availability`, jsonRequest('PATCH', { isAvailable: true }));
        console.log(`Published ${item.exhibit.slug}: ${exhibit.id}, ${upload.modelPath}`);
    }
    const publicCatalog = await request('/exhibits');
    for (const item of prepared) {
        assert.ok(publicCatalog.some(exhibit => exhibit.id === item.exhibit.slug), `Missing catalog entry ${item.exhibit.slug}`);
        const details = await request(`/exhibits/${item.exhibit.slug}`);
        assert.equal(details.behaviorType, item.exhibit.behaviorType);
        assert.ok(details.modelPath.startsWith('/uploads/models/'), 'Backend-managed model');
        assert.equal(details.field.profile, item.exhibit.field.profile);
        for (const entry of item.hotspots) assert.ok(details.hotspots.some(hotspot => hotspot.id === entry.key), `Missing hotspot ${entry.key}`);
        console.log(`Verified public details for ${item.exhibit.slug}.`);
    }
    console.log('Both models are in the public catalog.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
