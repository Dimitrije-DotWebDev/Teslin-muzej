const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname, '../src/Experience/UI/AutomaticTour.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default class', 'class');

function fixture() {
    let clock = 0;
    const window = new EventTarget();
    const document = new EventTarget();
    const badge = { hidden: true };
    document.hidden = false;
    document.getElementById = () => badge;
    const gsap = { killTweensOf() {}, to(target, values) {
        for (const key of ['x', 'y', 'z']) if (key in values) target[key] = values[key];
        return { kill() {} };
    } };
    const Tour = vm.runInNewContext(`${source}\nAutomaticTour`, { THREE, gsap, window, document, AbortController });
    const opened = [], shown = [], returned = [];
    const world = {
        catalog: { exhibits: [{ id: 'first', title: 'First', isAvailable: true },
            { id: 'disabled', isAvailable: false }, { id: 'second', title: 'Second', isAvailable: true }] },
        adminPanel: { isAdminRoute: () => false },
        experience: { camera: { instance: new THREE.PerspectiveCamera(75, 1.5),
            controls: { target: new THREE.Vector3(), autoRotate: false, autoRotateSpeed: 2 } } },
        async openExhibit(exhibit, options) {
            opened.push(exhibit.id);
            if (!options.shouldContinue()) return false;
            const model = new THREE.Group();
            model.add(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3)));
            const hotspots = [1, 2].map(index => {
                const target = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.3));
                target.position.set(index - 1.5, 0, 1.5);
                model.add(target);
                return { enabled: true, target, targets: [target], anchor: new THREE.Vector3(), show() {} };
            });
            world.activeExhibit = { model, hotspotController: {
                hotspots, close() {}, showAutomatic(hotspot) { shown.push(hotspots.indexOf(hotspot)); }
            } };
            world.activeExhibitId = exhibit.id;
            return true;
        },
        returnToCatalog(options) { returned.push(options); world.activeExhibit = null; }
    };
    world.experience.camera.instance.position.set(0, 3, 12);
    const tour = new Tour(world, { idleMs: 100, overviewMs: 40, hotspotMs: 10, catalogMs: 10, transitionMs: 10, now: () => clock });
    return { tour, world, window, document, badge, opened, shown, returned,
        advance(ms) { clock += ms; tour.update(); } };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
async function main() {
    {
        const f = fixture();
        f.advance(99); assert.equal(f.tour.active, false);
        f.advance(1); await flush();
        assert.equal(f.tour.active, true); assert.deepEqual(f.opened, ['first']);
        f.advance(5000); assert.equal(f.tour.stage, 'orbit-entry');
        f.advance(10); assert.equal(f.tour.stage, 'overview');
        assert.equal(f.world.experience.camera.controls.autoRotate, false, 'orbit uses a measured full turn');
        const camera = f.world.experience.camera;
        const start = camera.instance.position.clone();
        f.advance(10); assert.ok(camera.instance.position.x > f.tour.center.x, 'quarter turn');
        f.advance(10); assert.ok(camera.instance.position.z < f.tour.center.z, 'half turn');
        f.advance(10); assert.ok(camera.instance.position.x < f.tour.center.x, 'three-quarter turn');
        assert.deepEqual(f.shown, [], 'hotspots wait until the full first circle');
        f.advance(10); assert.deepEqual(f.shown, [0]);
        assert.equal(f.tour.stage, 'hotspot');
        const closeDistance = camera.instance.position.distanceTo(camera.controls.target);
        assert.ok(closeDistance < f.tour.distance, 'close-up fits highlighted geometry');
        const front = camera.instance.position.clone().sub(camera.controls.target).normalize();
        assert.ok(front.dot(f.tour.frontDirection) > 0.9999, 'close-up is from the fixed front');
        const closePosition = camera.instance.position.clone();
        f.advance(5); assert.ok(camera.instance.position.distanceTo(closePosition) < 1e-9, 'no orbit while reading');
        f.advance(5); assert.deepEqual(f.shown, [0, 1]);
        f.advance(10); assert.equal(f.tour.stage, 'orbit-entry');
        f.advance(10); assert.equal(f.tour.stage, 'outro');
        assert.equal(f.returned.length, 0, 'no catalog before second circle');
        f.advance(20); assert.ok(camera.instance.position.z < f.tour.center.z);
        f.advance(20); assert.equal(f.tour.stage, 'catalog');
        assert.ok(camera.instance.position.distanceTo(start) < 1e-8, 'second orbit completes exactly 360 degrees');
        assert.equal(f.returned[0].focus, false);
        f.advance(10); await flush(); assert.deepEqual(f.opened, ['first', 'second']);
        f.advance(5000); f.advance(10); f.advance(40); f.advance(10); f.advance(10);
        f.advance(10); f.advance(40); f.advance(10); await flush();
        assert.deepEqual(f.opened, ['first', 'second', 'first'], 'wrap around, skipping unavailable models');
        f.window.dispatchEvent(new Event('pointerdown'));
        assert.equal(f.tour.active, false); assert.equal(f.badge.hidden, true);
        assert.equal(f.world.experience.camera.controls.autoRotate, false);
        assert.equal(f.world.experience.camera.controls.autoRotateSpeed, 2);
        assert.ok(f.world.activeExhibit, 'interaction retains current exhibit');
        f.advance(99); assert.equal(f.tour.active, false);
        f.tour.dispose();
    }
    {
        const f = fixture();
        f.tour.start(); await flush();
        f.advance(5000); f.advance(10);
        const target = f.world.activeExhibit.hotspotController.hotspots[0].target;
        target.geometry = new THREE.BoxGeometry(3, 0.1, 3);
        f.advance(40);
        const camera = f.world.experience.camera;
        const direction = camera.instance.position.clone().sub(camera.controls.target).normalize();
        assert.ok(direction.y > 0.95, 'horizontal part is viewed face-on from above, not edge-on');
        f.window.dispatchEvent(new Event('pointermove'));
        assert.equal(f.tour.active, false, 'mouse motion interrupts close-up');
        f.tour.dispose();
    }
    {
        const f = fixture();
        const key = () => { const event = new Event('keydown', { cancelable: true }); event.key = 'g'; return event; };
        f.window.dispatchEvent(key()); await flush(); assert.equal(f.tour.active, true, 'G starts');
        f.window.dispatchEvent(key()); assert.equal(f.tour.active, false, 'G stops');
        f.world.adminPanel.isAdminRoute = () => true;
        f.tour.start(); assert.equal(f.tour.active, false, 'admin excluded');
        f.world.adminPanel.isAdminRoute = () => false;
        f.document.hidden = true; f.tour.start(); assert.equal(f.tour.active, false, 'background excluded');
        f.tour.dispose();
    }
    {
        const f = fixture();
        let finish;
        f.world.openExhibit = async (_, options) => {
            await new Promise(resolve => { finish = resolve; });
            if (!options.shouldContinue()) return false;
            throw new Error('Cancelled load must never attach a model');
        };
        f.tour.start(); assert.equal(f.tour.stage, 'loading');
        f.window.dispatchEvent(new Event('wheel')); finish(); await flush();
        assert.equal(f.tour.active, false); assert.equal(f.world.activeExhibit, undefined);
        f.advance(90); assert.equal(f.tour.active, false, 'no delayed restart after cancellation');
        f.tour.dispose();
    }
    {
        const f = fixture();
        f.world.openExhibit = async () => false;
        f.tour.start(); await flush(); assert.equal(f.tour.stage, 'catalog');
        f.advance(10); await flush(); assert.equal(f.tour.index, 1, 'failed model does not stall tour');
        f.tour.dispose();
    }
    console.log('Automatic tour: inactivity, G, ordered loop, hotspots, manual takeover, loading cancellation, failures and admin/background exclusion passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
