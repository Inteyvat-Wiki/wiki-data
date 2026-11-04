const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function check(body, environment = {}) {
    const script = `const assert=require('node:assert/strict');
        const entry=require.resolve('genshin-db'); require(entry);
        let prepared=0, opened=0, created=0, legacy=0;
        const snapshot={snapshotId:'a'.repeat(64),catalog:()=>moduleApi.wiki_source_folders.flatMap(folder=>
            (folder==='interactions'?['Shared']:['ChineseSimplified','English']).map(language=>({folder,language,count:1})))};
        const stable={characters:()=>({name:'snapshot'}),setOptions:()=>{}};
        require.cache[entry].exports={Language:{English:'English'},
            prepare:async()=>{prepared++;return snapshot},openSnapshot:()=>{opened++;return snapshot},
            createClient:()=>{created++;return stable},useProvider:()=>{legacy++},characters:()=>({name:'legacy'})};
        const moduleApi=require('./src/utils/genshin.ts');
        (async()=>{${body}})().catch(error=>{console.error(error);process.exitCode=1});`;
    execFileSync(process.execPath, ['--import', 'tsx', '-e', script], { cwd: root, encoding: 'utf8', env: {
        ...process.env, WIKI_DATA_BACKEND: '', WIKI_DATA_PREPARE: '', WIKI_DATA_SNAPSHOT: '', ...environment,
    } });
}
test('normal startup prepares once, rejects early queries and pins a separate client', () => check(`
    assert.throws(()=>moduleApi.default.characters('test'),/Initialize/);
    const [a,b]=await Promise.all([moduleApi.initialize_genshin(),moduleApi.initialize_genshin()]);
    assert.deepEqual(a,b);assert.equal(prepared,1);assert.equal(opened,0);assert.equal(created,1);
    assert.equal(moduleApi.default.characters('test').name,'snapshot');
`));
test('explicit pinned snapshots open without extraction', () => check(`
    await moduleApi.initialize_genshin();assert.equal(prepared,0);assert.equal(opened,1);
`, { WIKI_DATA_SNAPSHOT: 'a'.repeat(64) }));
test('incomplete snapshots fail without silent legacy fallback', () => check(`
    snapshot.catalog=()=>[];
    await assert.rejects(moduleApi.initialize_genshin(),/Incomplete Wiki snapshot/);
    assert.equal(created,0);assert.equal(legacy,0);
`, { WIKI_DATA_PREPARE: '0' }));
test('legacy comparison is explicit and invalid backend names are rejected', () => {
    check(`await moduleApi.initialize_genshin();assert.equal(legacy,1);assert.equal(prepared,0);
        assert.equal(moduleApi.default.characters('test').name,'legacy');`, { WIKI_DATA_BACKEND: 'legacy' });
    check(`await assert.rejects(moduleApi.initialize_genshin(),/Unknown WIKI_DATA_BACKEND/);
        assert.equal(prepared,0);assert.equal(opened,0);`, { WIKI_DATA_BACKEND: 'typo' });
});

test('a map-only client validates only its requested folders and cannot silently expand', () => check(`
    snapshot.catalog=()=>['English','ChineseSimplified'].map(language=>({language,folder:'maps',count:1}));
    await moduleApi.initialize_genshin({folders:['maps']});
    assert.equal(created,1);
    await assert.rejects(moduleApi.initialize_genshin(),/smaller selection/);
    await assert.rejects(moduleApi.initialize_genshin({folders:['unregistered']}),/Invalid/);
`));
