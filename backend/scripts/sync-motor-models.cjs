// Explicitly update/register the four completed motor exports through the admin API.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const api = (process.env.TESLA_MUSEUM_API_URL || 'http://localhost:5095/api').replace(/\/$/, '');
const definitions = [
    ['two-phase-motor', 'Двофазни мотор', 'Теслин индукциони систем', 'TwoPhasesGenerator', 'TeslinDvofazniMotor-verzija skalabilna test animacije prepravljene.glb', 0, 2, 8],
    ['three-phase-motor', 'Трофазни мотор', 'Теслин трофазни систем', 'ThreePhaseGenerator', '3fazni motor-animacije.glb', 1, 3, 6],
    ['magnetic-motor', 'Магнетни мотор', 'Обртно магнетно поље', 'MagneticMotor', 'magnetniMotor.glb', 2, 2, 4],
    ['electromagnetic-motor', 'Електромагнетни мотор', 'Електромагнети и обртно поље', 'ElectromagneticMotor', 'ElektromagnetniMotor.glb', 3, 2, 4]
];
const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function request(route, options = {}) {
    const response = await fetch(api + route, { ...options, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${route}: ${response.status} ${await response.text()}`);
    return response.status === 204 ? null : response.json();
}
async function getModel(url) {
    const response = await fetch(new URL(url, api), { signal: AbortSignal.timeout(60000) });
    assert.ok(response.ok, `Model unavailable: ${url}`);
    return Buffer.from(await response.arrayBuffer());
}
function prepare(definition) {
    const [slug, title, eyebrow, directory, filename, displayOrder, phaseCount, coilCount] = definition;
    const bytes = fs.readFileSync(path.join(root, 'client/static/models', directory, 'glb', filename));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const parts = new Map();
    for (const node of gltf.nodes) {
        const id = node.extras?.museumPartId;
        if (!id) continue;
        assert.ok(!parts.has(id), `${slug}: duplicate ID ${id}`);
        parts.set(id, node);
    }
    for (const name of ['motor', 'generator']) assert.ok(gltf.animations?.some(clip => clip.name === name), `${slug}: missing ${name} clip`);
    assert.ok(parts.has('rotor-motora'));
    const matching = pattern => [...parts.keys()].filter(id => pattern.test(id));
    const groups = [
        ['motor-windings', 'Намотаји мотора', 'Струје у намотајима стварају магнетно поље које делује на ротор мотора.', matching(/^(namotaj|namotaji|navoj)-motora/)],
        ['motor-rotor', 'Ротор мотора', 'Ротор је покретни део мотора. У приказу је његово обртање усклађено са магнетним пољем.', ['rotor-motora']],
        ['motor-stator', 'Статор мотора', 'Непокретни магнетни склоп окружује ротор и усмерава магнетни флукс.', matching(/^stator-motora(?:-|$)/)],
        ['generator-stator', 'Статор генератора', 'Непокретни део генератора учествује у усмеравању магнетног флукса.', matching(/^stator-generatora(?:-|$)/)],
        ['generator-rotor', 'Ротор генератора', 'Обртни део генератора учествује у претварању механичке енергије у електричну.', matching(/^rotor-generatora(?:-|$)/)],
        ['conductor', 'Проводник', 'Проводници електрично повезују генератор и мотор.', matching(/^provodnik(?:-|$)/)]
    ].filter(group => group[3].length);
    function center(id) {
        const node = parts.get(id);
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const primitive of gltf.meshes[node.mesh].primitives) {
            const bounds = gltf.accessors[primitive.attributes.POSITION];
            for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], bounds.min[axis]);
                max[axis] = Math.max(max[axis], bounds.max[axis]);
            }
        }
        const values = min.map((value, axis) => (value + max[axis]) / 2);
        assert.ok(values.every(Number.isFinite));
        return vector(...values);
    }
    const field = {
        profile: 'rotating-field', referencePartId: 'rotor-motora', rotationPartId: 'rotor-motora',
        secondaryReferencePartId: null, secondaryRotationPartId: null,
        transform: { position: vector(), rotation: vector(), scale: vector(0.65, 0.65, 0.65) },
        rotationAxis: 'z', angleMultiplier: 1, phaseOffsetDegrees: 0,
        engineering: { phaseCount, coilCount, polePairs: 1, showVirtualMagnet: true, showTorqueVector: true }
    };
    return { slug, title, eyebrow, filename, displayOrder, bytes, parts, groups, center, field };
}
function buildPlan(item, existing, oldHotspots) {
    const expand = id => {
        if (item.parts.has(id)) return [id];
        const group = item.groups.find(group => group[0] === (
            /^(namotaj|namotaji|navoj)-motora/.test(id) ? 'motor-windings'
                : id === 'stator-motora' ? 'motor-stator'
                    : id === 'rotor-generatora' ? 'generator-rotor' : ''));
        assert.ok(group, `${item.slug}: cannot remap custom hotspot part ${id}`);
        return group[3];
    };
    const hotspots = oldHotspots.map(hotspot => ({
        ...hotspot,
        anchorPartId: expand(hotspot.anchorPartId)[0],
        targetPartIds: [...new Set(hotspot.targetPartIds.flatMap(expand))],
        localPosition: item.center(expand(hotspot.anchorPartId)[0])
    }));
    item.groups.forEach(([key, title, description, ids], displayOrder) => {
        if (!hotspots.some(hotspot => hotspot.key === key)) hotspots.push({
            key, title, description, anchorPartId: ids[0], targetPartIds: ids,
            localPosition: item.center(ids[0]), isEnabled: true, displayOrder
        });
    });
    const field = existing?.field ? structuredClone(existing.field) : item.field;
    if (!item.parts.has(field.referencePartId)) {
        field.referencePartId = 'rotor-motora';
        field.transform.position = vector();
    }
    field.rotationPartId = 'rotor-motora';
    field.rotationAxis = 'z';
    for (const id of [field.referencePartId, field.rotationPartId]) assert.ok(item.parts.has(id));
    const exhibit = existing ? { ...existing, field, displayOrder: item.displayOrder } : {
        slug: item.slug, title: item.title, eyebrow: item.eyebrow,
        description: `${item.title} приказује деловање обртног магнетног поља на ротор. Истражите намотаје, генератор и повезане делове система.`,
        behaviorType: item.slug, thumbnailPath: null, field, displayOrder: item.displayOrder
    };
    return { ...item, existing, exhibit, hotspots, oldHotspots };
}
async function main() {
    const models = definitions.map(prepare);
    models.forEach(item => console.log(`Validated ${item.slug}: ${item.parts.size} part IDs, motor/generator clips.`));
    if (!process.argv.includes('--apply')) return;
    const catalog = await request('/admin/exhibits');
    const plans = [];
    for (const item of models) {
        const existing = catalog.find(exhibit => exhibit.slug === item.slug);
        const hotspots = existing ? await request(`/admin/exhibits/${existing.id}/hotspots`) : [];
        plans.push(buildPlan(item, existing, hotspots));
    }
    const backup = path.join(__dirname, 'backups', `motors-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, JSON.stringify(plans.map(item => ({ exhibit: item.existing,
        hotspots: item.oldHotspots })), null, 2));
    for (const plan of plans) {
        let modelPath = plan.existing?.modelPath;
        if (!modelPath || hash(await getModel(modelPath)) !== hash(plan.bytes)) {
            const form = new FormData();
            form.append('file', new Blob([plan.bytes], { type: 'model/gltf-binary' }), plan.filename);
            modelPath = (await request('/admin/exhibits/model', { method: 'POST', body: form })).modelPath;
        }
        assert.equal(hash(await getModel(modelPath)), hash(plan.bytes), 'Backend model matches new source');
        const payload = { ...plan.exhibit, modelPath };
        const exhibit = plan.existing
            ? await request(`/admin/exhibits/${plan.existing.id}`, json('PUT', payload))
            : await request('/admin/exhibits', json('POST', payload));
        for (const hotspot of plan.hotspots) {
            await request(`/admin/exhibits/${exhibit.id}/hotspots${hotspot.id ? '/' + hotspot.id : ''}`,
                json(hotspot.id ? 'PUT' : 'POST', hotspot));
        }
        if (!plan.existing) await request(`/admin/exhibits/${exhibit.id}/availability`, json('PATCH', { isAvailable: true }));
        const details = await request(`/exhibits/${plan.slug}`);
        assert.equal(details.modelPath, modelPath);
        for (const hotspot of details.hotspots) {
            assert.ok(plan.parts.has(hotspot.anchorPartId));
            hotspot.targetPartIds.forEach(id => assert.ok(plan.parts.has(id)));
        }
        console.log(`${plan.existing ? 'Updated' : 'Added'} ${plan.slug}: ${details.hotspots.length} valid hotspots; ${modelPath}`);
    }
    console.log('All four motor models registered; original backend configuration saved under scripts/backups.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
