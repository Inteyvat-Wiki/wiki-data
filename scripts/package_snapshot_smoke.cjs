'use strict';
// Runs only inside check:packages' isolated consumer, against installed tarballs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const forbidden = JSON.parse(process.env.GENSHIN_PACKAGE_FORBIDDEN_ROOTS || '[]');
assert(forbidden.length, 'Run through npm run check:packages');
for (const method of ['readFileSync', 'openSync']) {
    const original = fs[method];
    fs[method] = function(file, ...args) {
        const name = String(file).replaceAll('\\', '/').toLowerCase();
        assert(!forbidden.some(root => name.startsWith(root)), `Workspace read from packed consumer: ${file}`);
        return original.call(this, file, ...args);
    };
}
const root = path.resolve('snapshot-fixture'), source = path.join(root, 'source');
assert(!fs.existsSync(root), 'Smoke test requires a fresh directory');
function write(name, value) {
    const file = path.join(source, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
}
const excel = (name, rows) => write(`ExcelBinOutput/${name}.json`, rows);
excel('AvatarExcelConfigData', []);
excel('AvatarSkillDepotExcelConfigData', []);
excel('ManualTextMapConfigData', ['Fire', 'Water', 'Grass', 'Electric', 'Wind', 'Ice', 'Rock',
    'WEAPON_SWORD_ONE_HAND', 'WEAPON_CATALYST', 'WEAPON_CLAYMORE', 'WEAPON_BOW', 'WEAPON_POLE']
    .map((textMapId, index) => ({ textMapId, textMapContentTextMapHash: 100 + index })));
excel('CityConfigData', [{ cityId: 1, cityNameTextMapHash: 200 }, { cityId: 2, cityNameTextMapHash: 201 }]);
excel('AvatarFlycloakExcelConfigData', [{ materialId: 140001, nameTextMapHash: 1, descTextMapHash: 2, icon: 'FixtureArt' }]);
excel('MaterialExcelConfigData', [{ id: 140001, icon: 'FixtureIcon', rankLevel: 4 }]);
excel('MaterialSourceDataExcelConfigData', [
    { id: 140001, textList: [], renamedJumpDescriptions: [] },
    { id: 210001, renamedJumpDescriptions: [3428310340, 1366389946, 3237647833, 326911317, 696736979, 1009452272, 549049380] },
]);
excel('DocumentExcelConfigData', []);
excel('LocalizationExcelConfigData', []);
for (const language of ['EN', 'CHS']) {
    write(`TextMap/TextMap${language}.json`, { 1: language === 'EN' ? 'Fixture Wings' : '测试风之翼', 2: '<i>Original</i>', 200: 'Mondstadt', 201: 'Snezhnaya' });
    write(`TextMap/TextMap_Medium${language}.json`, {});
}
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${source.replaceAll('\\', '/')}`,
    '-c', 'commit.gpgsign=false', '-C', source, ...args], { encoding: 'utf8', windowsHide: true, stdio: 'pipe' });
git('init', '-q'); git('add', '.');
git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Package fixture');
(async () => {
    const provider = require('genshindata-scripts'), db = require('genshin-db');
    const options = { sourceRoot: source, cacheRoot: path.join(root, 'data-cache'), folders: ['windgliders'], languages: ['CHS', 'EN'], versions: false, log: line => console.error(line) };
    const snapshot = await provider.prepare(options);
    assert.equal(snapshot.verify(), true);
    assert.equal((await provider.prepare(options)).snapshotId, snapshot.snapshotId, 'Packed cache must be reusable');
    const client = db.createClient(snapshot, { cacheRoot: path.join(root, 'index-cache') });
    const item = client.windgliders('140001', { matchIds: true, resultLanguage: 'English' });
    assert.equal(item.name, 'Fixture Wings');
    assert.equal(item.descriptionRaw, '<i>Original</i>');
    assert.equal(client.windgliders('140001', { matchIds: true, resultLanguage: 'ChineseSimplified' }).name, '测试风之翼');
    assert.equal(db.openSnapshot({ cacheRoot: options.cacheRoot, indexCacheRoot: path.join(root, 'index-cache'), snapshotId: snapshot.snapshotId }).snapshotId, snapshot.snapshotId);
    console.log('Packed provider extraction, cache reuse, pinned indexes and bilingual queries passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
