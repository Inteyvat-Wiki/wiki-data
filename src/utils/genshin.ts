import genshindb from 'genshin-db';

// One initialization boundary; normal public query calls remain unchanged.
export const wiki_source_folders = ['characters', 'talents', 'constellations', 'stories', 'voiceovers', 'weapons',
    'artifacts', 'materials', 'foods', 'enemies', 'animals', 'geographies', 'dungeons', 'maplayers', 'maps', 'books',
    'documents', 'chapters', 'tasks', 'questitems', 'npcs', 'interactions', 'hyperlinks', 'serenitea', 'tcg',
    'miliastra', 'misc', 'tasksubtitles', 'outfits', 'weaponskins', 'windgliders'];
type SourceInfo = { backend: 'legacy' | 'snapshot'; snapshotId?: string };
let client: typeof genshindb | ReturnType<typeof genshindb.createClient> | undefined;
let ready: Promise<SourceInfo> | undefined;
let info: SourceInfo | undefined;
let selected_folders: string[] | undefined;

export function initialize_genshin(options: { folders?: string[] } = {}): Promise<SourceInfo> {
    const folders = options.folders || wiki_source_folders;
    if (!folders.length || folders.some(folder => !wiki_source_folders.includes(folder))) return Promise.reject(new Error('Invalid Wiki source folders'));
    if (selected_folders && folders.some(folder => !selected_folders!.includes(folder))) return Promise.reject(new Error('Wiki client is already pinned to a smaller selection'));
    selected_folders ||= [...folders];
    return ready ||= (async () => {
        const backend = process.env.WIKI_DATA_BACKEND || 'snapshot';
        if (backend === 'legacy') {
            genshindb.useProvider();
            client = genshindb;
            return info = { backend };
        }
        if (backend !== 'snapshot') throw new Error(`Unknown WIKI_DATA_BACKEND: ${backend}`);
        const cacheRoot = process.env.WIKI_DATA_CACHE || process.env.GENSHIN_DATA_CACHE;
        const indexCacheRoot = process.env.WIKI_DATA_INDEX_CACHE || process.env.GENSHIN_DB_CACHE;
        // Normal runs validate input identity and reuse/rebuild upstream caches as needed.
        // Explicit snapshots (or PREPARE=0) are read-only, reproducible migration inputs.
        const prepare = process.env.WIKI_DATA_PREPARE === '1'
            || !process.env.WIKI_DATA_SNAPSHOT && process.env.WIKI_DATA_PREPARE !== '0';
        const snapshot = prepare
            ? await genshindb.prepare({ sourceRoot: process.env.GENSHIN_DATA_SOURCE, cacheRoot, indexCacheRoot,
                folders, languages: ['CHS', 'EN'],
                historyRefs: process.env.GENSHIN_HISTORY_REFS?.split(',').filter(Boolean),
                historySeedCache: process.env.GENSHIN_HISTORY_SEED,
                luaRoot: process.env.GENSHIN_LUA_PATH, log: message => console.error(message) })
            : genshindb.openSnapshot({ cacheRoot, indexCacheRoot, snapshotId: process.env.WIKI_DATA_SNAPSHOT });
        const catalog = snapshot.catalog();
        const missing = folders.flatMap(folder => (folder === 'interactions' ? ['Shared'] : ['ChineseSimplified', 'English'])
            .filter(language => !catalog.some(row => row.folder === folder && row.language === language && row.count > 0))
            .map(language => `${language}/${folder}`));
        if (missing.length) throw new Error(`Incomplete Wiki snapshot: ${missing.join(', ')}. Prepare all wiki_source_folders first.`);
        client = genshindb.createClient(snapshot, { cacheRoot: indexCacheRoot });
        return info = { backend, snapshotId: snapshot.snapshotId };
    })();
}
export function genshin_source_info() { return info; }

const query = new Proxy(genshindb, {
    get(target, key) {
        if (['Language', 'Folder', 'Options', 'MatchType'].includes(String(key))) return Reflect.get(target, key);
        if (!client) throw new Error('Initialize genshin-db through initialize_genshin() before querying Wiki data');
        return Reflect.get(client, key);
    },
});
export default query;
