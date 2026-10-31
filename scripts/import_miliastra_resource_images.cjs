// Image-only import: all raw-data/resource-key interpretation is upstream.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { validatePng } = require('./import_misc_images.cjs');
function run(work, output) {
    const plan = JSON.parse(fs.readFileSync(path.join(work, 'resource-plan.json'), 'utf8'));
    assert.equal(plan.schema, 1);
    const wanted = new Map();
    for (const { image } of Object.values(plan.resources)) {
        if (!wanted.has(image.Name)) wanted.set(image.Name, []);
        wanted.get(image.Name).push(image);
    }
    const candidates = [];
    const images = new Map();
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) { visit(file); continue; }
            if (!entry.name.endsWith('.png')) continue;
            const name = path.parse(entry.name).name, requested = wanted.get(name);
            if (!requested) continue;
            assert(requested.some(image => file.split(path.sep).includes(path.basename(image.Source) + '_export')),
                `PNG from unexpected block: ${file}`);
            const png = validatePng(fs.readFileSync(file));
            const value = { name, file, ...png }, previous = images.get(name);
            candidates.push(value);
            if (previous && plan.image_selection !== 'largest') assert.equal(previous.sha256, png.sha256, `Conflicting exact image: ${name}`);
            if (!previous || value.width * value.height > previous.width * previous.height
                || value.width * value.height === previous.width * previous.height && (value.bytes > previous.bytes
                    || value.bytes === previous.bytes && value.file < previous.file)) images.set(name, value);
        }
    }
    visit(work);
    assert.equal(images.size, wanted.size, `Incomplete extraction: ${images.size}/${wanted.size}`);
    fs.mkdirSync(output); // never overwrite old imports
    for (const [name, image] of images) {
        assert(/^UI_[A-Za-z0-9_]+$/.test(name));
        fs.copyFileSync(image.file, path.join(output, name + '.png'), fs.constants.COPYFILE_EXCL);
    }
    fs.writeFileSync(path.join(work, 'validated-import.json'), JSON.stringify({ output, count: images.size,
        inputs: plan.inputs, candidates, images: [...images.values()] }, null, 2), { flag: 'wx' });
    return { imported: images.size, output };
}
module.exports = { run };
if (require.main === module) {
    const [work, output] = process.argv.slice(2);
    assert(output, 'Usage: node scripts/import_miliastra_resource_images.cjs EXTRACTION_DIR NEW_IMAGE_DIR');
    console.log(JSON.stringify(run(path.resolve(work), path.resolve(output))));
}
