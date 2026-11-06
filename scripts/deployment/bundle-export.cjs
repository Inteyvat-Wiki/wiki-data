'use strict';
// Create the existing upload protocol stream without requiring publishing credentials.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {validateDataset, buildManifest, bundle} = require('../upload_data.cjs');

async function main(args = process.argv.slice(2)) {
    assert.equal(args.length, 2, 'Usage: bundle-export.cjs EXPORT_ROOT NEW_BUNDLE');
    const [source, destination] = args.map(value => path.resolve(value));
    assert(!fs.existsSync(destination), 'Bundle must be new');
    validateDataset(source);
    const plan = await buildManifest(source);
    await pipeline(Readable.from(bundle(plan)), fs.createWriteStream(destination, {flags: 'wx', mode: 0o600}));
    const report = {schema: 1, source, releaseId: plan.releaseId, files: plan.manifest.files.length,
        payloadBytes: plan.manifest.totalBytes, bundleBytes: fs.statSync(destination).size};
    fs.writeFileSync(destination + '.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    console.log(JSON.stringify(report));
}
module.exports = {main};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
