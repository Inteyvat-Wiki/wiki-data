// Image-only Wiki adapter: all resource-key interpretation remains upstream.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {importResourceImages} = require('@inteyvat-wiki/resource-tools');
function run(work, output) {
    const planFile = path.join(work, 'resource-plan.json');
    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
    assert.equal(plan.schema, 1);
    const wanted = new Map();
    for (const {image} of Object.values(plan.resources)) {
        assert(/^UI_[A-Za-z0-9_]+$/.test(image.Name), 'Invalid Wiki resource image name');
        if (!wanted.has(image.Name)) wanted.set(image.Name, []);
        wanted.get(image.Name).push(image);
    }
    const reportFile = path.join(work, 'validated-import.json');
    const options = {directories: [work], wanted: [...wanted.keys()],
        selection: plan.image_selection || 'preserve', output, inputs: [planFile],
        validateCandidate({name, file}) {
            assert(wanted.get(name).some(image => file.split(path.sep).includes(path.basename(image.Source) + '_export')),
                `PNG from unexpected block: ${file}`);
        }};
    const preview = importResourceImages(options);
    for (const diagnostic of preview.diagnostics) {
        assert(diagnostic.reason !== 'ambiguous_candidates', `Conflicting exact image: ${diagnostic.name}`);
        if (diagnostic.detail?.includes('unexpected block')) throw new Error(diagnostic.detail);
    }
    assert(!fs.existsSync(reportFile), 'Import report exists');
    const report = importResourceImages({...options, apply: true});
    // Preserve the original compatibility report, including flat candidates.
    fs.writeFileSync(reportFile, JSON.stringify({output, count: report.imported, inputs: plan.inputs,
        input_hashes: report.inputs, candidates: report.candidates.flatMap(group => group.images),
        images: report.images}, null, 2), {flag: 'wx'});
    return {imported: report.imported, output};
}
module.exports = {run};
if (require.main === module) {
    try {
        const [work, output] = process.argv.slice(2);
        assert(output, 'Usage: node scripts/import_miliastra_resource_images.cjs EXTRACTION_DIR NEW_IMAGE_DIR');
        console.log(JSON.stringify(run(path.resolve(work), path.resolve(output))));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
