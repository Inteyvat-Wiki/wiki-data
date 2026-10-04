const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const database = path.dirname(require.resolve('genshin-db'));

function read_folder(folder, language = 'English') {
    const directory = path.join(database, 'data', language, folder);
    return fs.readdirSync(directory).filter(file => file.endsWith('.json')).map(file => ({
        filename: file.slice(0, -5),
        data: JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
    }));
}

const books = read_folder('books').filter(({ data }) => data.name)
    .sort((a, b) => (a.data.sortOrder ?? Infinity) - (b.data.sortOrder ?? Infinity) || a.data.codexId - b.data.codexId);
const documents = read_folder('documents').filter(({ data }) => data.name && data.content.length > 0)
    .sort((a, b) => a.data.id - b.data.id);
const book_labels = new Map(read_folder('books', 'ChineseSimplified').map(({ data }) => [data.codexId, data.name]));
const document_labels = new Map(read_folder('documents', 'ChineseSimplified').map(({ data }) => [data.id, data.name]));

function title_id(title) {
    const id = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9\s]+/g, '').trim().replace(/\s+/g, '_');
    // Titles made only of punctuation still derive their id from the title, never from Document.id.
    return id || `title_${Array.from(title).map(char => char.codePointAt(0).toString(16)).join('_')}`;
}

const counts = new Map();
const indexes = new Map();
for (const { data } of documents) {
    const id = title_id(data.name);
    counts.set(id, (counts.get(id) || 0) + 1);
}

function label(name) {
    return name.replace(/[\r\n]+/g, ' ');
}

const book_lines = books.map(({ filename, data }) =>
    `    ${JSON.stringify(filename)},`.padEnd(80) + ` // ${label(book_labels.get(data.codexId) || data.name)}`);
const readable_lines = documents.map(({ data }) => {
    const base = title_id(data.name);
    const index = indexes.get(base) || 0;
    indexes.set(base, index + 1);
    const id = counts.get(base) > 1 ? `${base}-${index}` : base;
    return `    ${JSON.stringify(id)}: ${JSON.stringify(data.alias)},`.padEnd(80)
        + ` // ${label(document_labels.get(data.id) || data.name)}`;
});

fs.writeFileSync(path.join(root, 'src/data/books.js'),
    `// Ordered by BooksCodex.sortOrder, then codexId.\nexport default [\n${book_lines.join('\n')}\n];\n`);
fs.writeFileSync(path.join(root, 'src/data/readables.js'),
    `// Ordered by Document.id; duplicate titles use -0, -1, ... in that order.\nexport default {\n${readable_lines.join('\n')}\n};\n`);
console.log(`Reading lists: ${books.length} books, ${documents.length} documents.`);
