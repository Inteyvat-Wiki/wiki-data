const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('character link descriptions include terms used only by constellations', () => {
    const term = id => ({ id, title: `Term ${id}`, descriptionRaw: `Description ${id}` });
    const source = fs.readFileSync(path.join(__dirname, '../src/character.ts'), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
    } }).outputText;
    const dependencies = {
        '~/utils/page': {}, '~/data/characters': [], '~/utils/i18n': { t: key => key },
        '~/utils/convert_raw': { ConvertRaw: { get_images_url: () => '', get_element: () => 'pyro',
            get_weapon_type: () => 'sword', is_precent_stat_type: () => false } },
        '~/utils/data': {
            get_hyperlinks: () => ({ hyperlinks: [term(10), term(20), term(30)] }),
            CharacterData: {
                get_character: () => ({ name: 'Fixture', images: {}, stats: () => ({ hp: 1, attack: 1, defense: 1, specialized: 0 }) }),
                get_talents: () => ({ images: {}, combat1: { id: 1, name: 'Skill', descriptionRaw: '{LINK#N10}Skill term{/LINK}' } }),
                get_constellations: () => ({ images: {}, ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [
                    `c${i + 1}`, { id: i + 1, name: 'Constellation', descriptionRaw: i === 5 ? '{LINK#N20}Constellation term{/LINK} {LINK#N10}Shared term{/LINK}' : '' },
                ])) }),
                get_stories: () => ({ stories: [] }),
                get_voiceovers: () => ({ friendLines: [], actionLines: [] }),
            },
        },
    };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => {
        assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
        return dependencies[name];
    }, module, module.exports);
    assert.deepEqual(module.exports.get_character('fixture', 'en').link_description.map(item => item.id), [10, 20]);
});
