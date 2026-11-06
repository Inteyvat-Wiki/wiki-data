import genshindb from '@inteyvat-wiki/genshin-db';
import { pipeline_config as config } from './config';

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
        const { backend, prepare, snapshot: snapshotId } = config.query;
        if (backend === 'legacy') {
            genshindb.useProvider();
            client = genshindb;
            return info = { backend };
        }
        if (backend !== 'snapshot') throw new Error(`Unknown WIKI_DATA_BACKEND: ${backend}`);
        const cacheRoot = config.cache.exports;
        const indexCacheRoot = config.cache.indexes;
        // Normal runs validate input identity and reuse/rebuild upstream caches as needed.
        // Explicit snapshots (or PREPARE=0) are read-only, reproducible migration inputs.
        const snapshot = prepare
            ? await genshindb.prepare({ sourceRoot: config.source.root, cacheRoot, indexCacheRoot,
                folders, languages: ['CHS', 'EN'],
                historyRefs: config.source.historyRefs, historySeedCache: config.source.historySeedCache,
                versions: config.source.versions, versionOverrides: config.source.versionOverrides,
                luaRoot: config.resources.luaRoot, resourceCaches: config.resources.caches,
                log: message => console.error(message) })
            : genshindb.openSnapshot({ cacheRoot, indexCacheRoot, snapshotId });
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
