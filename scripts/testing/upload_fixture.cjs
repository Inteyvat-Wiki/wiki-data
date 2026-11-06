'use strict';
// Deliberately empty bilingual categories: no raw game input or production output.
const fs = require('node:fs');
const path = require('node:path');
const {PNG} = require('pngjs');
const {CONTENT_CATEGORIES} = require('@inteyvat-wiki/wiki-contracts/registry');

function writeUploadFixture(root) {
    const write = (file, value) => {
        const name = path.join(root, file);
        fs.mkdirSync(path.dirname(name), {recursive: true});
        fs.writeFileSync(name, JSON.stringify(value));
    };
    write('common/menu.json', {character: {icon: '/images/test.png'}, weapon: {icon: '/images/test.png'}, artifact: {icon: '/images/test.png'}});
    write('common/maps.json', {});
    write('common/map/task_dependencies.json', {schema: 1, sameTaskOrder: 'ascending', edges: []});
    for (const category of CONTENT_CATEGORIES) {
        write(`common/${category}/ids.json`, []);
        for (const lang of ['en', 'zh_hans']) {
            write(`${lang}/${category}/pages.json`, []);
            fs.mkdirSync(path.join(root, lang, category, 'items'));
        }
    }
    for (const lang of ['en', 'zh_hans']) {
        write(`${lang}/map/catalogue.json`, {schema: 1, items: []});
        write(`${lang}/map/scenes.json`, {schema: 1, scenes: []});
    }
    fs.mkdirSync(path.join(root, 'images'));
    fs.writeFileSync(path.join(root, 'images/test.png'), PNG.sync.write(new PNG({width: 1, height: 1})));
    return {root, write};
}

module.exports = {writeUploadFixture};
