const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const config = fs.readFileSync(path.join(__dirname, '../src/config.js'), 'utf8');
assert.match(config, /baseURL\s*=\s*['"]\/api['"]/);
const source = fs.readFileSync(path.join(__dirname, '../src/Experience/Api/ExhibitApi.js'), 'utf8')
    .replace('export default class', 'class');
for (const origin of ['http://localhost:8080', 'http://192.168.1.42:8080', 'http://10.0.0.7:8081']) {
    const Api = vm.runInNewContext(`${source}\nExhibitApi`, { URL, window: { location: { origin } } });
    const api = new Api('/api');
    assert.equal(new URL(api.baseUrl + '/exhibits', origin).origin, origin);
    assert.equal(api.resolveAssetUrl('/uploads/models/test.glb'), `${origin}/uploads/models/test.glb`);
    assert.equal(api.resolveAssetUrl('/uploads/thumbnails/test.png'), `${origin}/uploads/thumbnails/test.png`);
    assert.equal(api.resolveAssetUrl('/models/test.glb'), '/models/test.glb');
    const override = new Api('http://other-server:5095/api');
    assert.equal(override.resolveAssetUrl('/uploads/models/test.glb'), 'http://other-server:5095/uploads/models/test.glb');
}
console.log('LAN API/model/thumbnail URLs and explicit API overrides passed.');
