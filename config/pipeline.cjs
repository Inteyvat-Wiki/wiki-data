'use strict';
// Machine-specific paths belong to the consumer, never to an installed package.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const resourceKeys = ['miliastra', 'profileFrames', 'maps', 'mapIcons', 'worldAreas', 'mapAreaConfigs', 'mapBase', 'mapFog', 'mapEffects', 'mapLimitOutlines', 'levelTags'];
const resourceEnv = ['MILIASTRA_RESOURCE_CACHE', 'PROFILE_FRAME_RESOURCE_CACHE', 'MAP_RESOURCE_CACHE', 'MAP_ICON_RESOURCE_CACHE',
    'MAP_WORLD_AREA_RESOURCE_CACHE', 'MAP_AREA_CONFIG_RESOURCE_CACHE', 'MAP_BASE_RESOURCE_CACHE', 'MAP_FOG_RESOURCE_CACHE', 'MAP_EFFECT_RESOURCE_CACHE', 'MAP_LIMIT_OUTLINE_RESOURCE_CACHE', 'MAP_LEVEL_TAG_RESOURCE_CACHE'];

function object(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
    for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`Unknown ${label}.${key}`);
    return value;
}
function text(value, label) {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error(`${label} must be a nonempty string`);
    return value;
}
function strings(value, label) {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`${label} must be a string array`);
    return [...value];
}
function cacheHome(env) {
    const base = process.platform === 'win32' ? env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local')
        : process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches') : env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    return path.join(base, 'Inteyvat-Wiki');
}
function validateOutputs(config) {
    const inputs = [config.source.root, config.resources.studio, config.resources.root].filter(Boolean);
    for (const target of [config.output.data, config.cache.exports, config.cache.indexes, config.cache.resources]) {
        if (target === path.parse(target).root || target.split(path.sep).some(part => part.toLowerCase() === 'node_modules'))
            throw new Error(`Output/cache must be outside node_modules and filesystem roots: ${target}`);
        for (const input of inputs) {
            const relative = path.relative(input, target);
            if (!relative || relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
                throw new Error(`Output/cache overlaps external input ${input}: ${target}`);
        }
    }
    return config;
}
function loadConfig({file, cwd = process.cwd(), env = process.env} = {}) {
    const explicit = file || env.WIKI_DATA_CONFIG;
    const configFile = path.resolve(cwd, explicit || 'wiki-data.config.json');
    if (explicit && !fs.existsSync(configFile)) throw new Error(`Configuration not found: ${configFile}`);
    const exists = fs.existsSync(configFile);
    const raw = exists ? JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/^\uFEFF/, '')) : {version: 1};
    object(raw, ['version', 'source', 'resources', 'cache', 'output', 'query', 'upload'], 'config');
    if (raw.version !== 1) throw new Error('Unsupported config.version (expected 1)');
    const base = exists ? path.dirname(configFile) : path.resolve(cwd);
    const resolve = (value, label) => value === undefined ? undefined : path.resolve(base, text(value, label));
    // Environment paths keep conventional cwd-relative semantics; JSON paths use its directory.
    const setting = (value, variable, label) => env[variable] ? path.resolve(cwd, env[variable]) : resolve(value, label);
    const section = (value, keys, label) => object(value === undefined ? {} : value, keys, label);
    const source = section(raw.source, ['root', 'historyRefs', 'historySeedCache', 'versions', 'versionOverrides'], 'source');
    const resources = section(raw.resources, ['studio', 'assetMap', 'root', 'dotnet', 'game', 'luaRoot', 'imageRoots', 'caches'], 'resources');
    const cache = section(raw.cache, ['root', 'exports', 'indexes', 'resources'], 'cache');
    const output = section(raw.output, ['data', 'assets'], 'output');
    const query = section(raw.query, ['snapshot', 'prepare', 'backend'], 'query');
    const upload = section(raw.upload, ['url', 'tokenEnv', 'timeoutMs'], 'upload');
    const uploadUrl = env.WIKI_UPLOAD_URL || upload.url;
    if (uploadUrl !== undefined) {
        let url;
        try { url = new URL(text(uploadUrl, 'upload.url')); } catch { throw new Error('upload.url must be an absolute HTTP(S) endpoint'); }
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
            throw new Error('upload.url must use HTTP(S) without credentials, query or fragment');
    }
    const tokenEnv = upload.tokenEnv === undefined ? 'WIKI_UPLOAD_TOKEN' : upload.tokenEnv;
    if (typeof tokenEnv !== 'string' || !/^[A-Z][A-Z0-9_]{0,127}$/.test(tokenEnv)) throw new Error('upload.tokenEnv must name an environment variable, not contain the token');
    const timeoutMs = upload.timeoutMs === undefined ? 1800000 : upload.timeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 7200000) throw new Error('upload.timeoutMs must be 1000..7200000');
    const caches = section(resources.caches, resourceKeys, 'resources.caches');
    const root = setting(cache.root, 'WIKI_CACHE_ROOT', 'cache.root') || cacheHome(env);
    const resourceRoot = resolve(cache.resources, 'cache.resources') || path.join(root, 'resources');
    const historyRefs = env.GENSHIN_HISTORY_REFS ? env.GENSHIN_HISTORY_REFS.split(',')
        : source.historyRefs === undefined ? ['HEAD'] : strings(source.historyRefs, 'source.historyRefs');
    if (!historyRefs.length || historyRefs.some(ref => !ref || ref.startsWith('-'))) throw new Error('Invalid source.historyRefs');
    const versions = source.versions === undefined ? true : source.versions;
    if (typeof versions !== 'boolean') throw new Error('source.versions must be boolean');
    const versionOverrides = source.versionOverrides === undefined ? {} : source.versionOverrides;
    if (!versionOverrides || typeof versionOverrides !== 'object' || Array.isArray(versionOverrides)
        || Object.entries(versionOverrides).some(([hash, version]) => !/^[a-f0-9]{40}$/.test(hash) || typeof version !== 'string' || !/^\d+\.\d+$/.test(version)))
        throw new Error('source.versionOverrides must map full commit hashes to major.minor versions');
    const snapshot = env.WIKI_DATA_SNAPSHOT || query.snapshot;
    if (snapshot !== undefined && !/^[a-f0-9]{64}$/.test(snapshot)) throw new Error('query.snapshot must be a snapshot SHA-256');
    if (env.WIKI_DATA_PREPARE && !['0', '1'].includes(env.WIKI_DATA_PREPARE)) throw new Error('WIKI_DATA_PREPARE must be 0 or 1');
    const prepare = env.WIKI_DATA_PREPARE ? env.WIKI_DATA_PREPARE === '1' : query.prepare === undefined ? !snapshot : query.prepare;
    if (typeof prepare !== 'boolean') throw new Error('query.prepare must be boolean');
    const backend = env.WIKI_DATA_BACKEND || (query.backend === undefined ? 'snapshot' : query.backend);
    if (!['snapshot', 'legacy'].includes(backend)) throw new Error(`Unknown WIKI_DATA_BACKEND: ${backend}`);
    const imageRoots = env.WIKI_IMAGE_ROOTS ? env.WIKI_IMAGE_ROOTS.split(path.delimiter).map(item => path.resolve(cwd, text(item, 'WIKI_IMAGE_ROOTS')))
        : resources.imageRoots === undefined ? [path.join(resourceRoot, 'images')]
            : strings(resources.imageRoots, 'resources.imageRoots').map(item => resolve(item, 'resources.imageRoots'));
    const config = validateOutputs({
        configFile: exists ? configFile : undefined,
        source: {root: setting(source.root, 'GENSHIN_DATA_SOURCE', 'source.root'), historyRefs, versions, versionOverrides,
            historySeedCache: setting(source.historySeedCache, 'GENSHIN_HISTORY_SEED', 'source.historySeedCache')},
        resources: {studio: setting(resources.studio, 'ANIMESTUDIO_PATH', 'resources.studio'),
            assetMap: setting(resources.assetMap, 'ANIMESTUDIO_MAP', 'resources.assetMap'),
            root: setting(resources.root, 'GENSHIN_RESOURCE_ROOT', 'resources.root'),
            dotnet: setting(resources.dotnet, 'DOTNET_HOST_PATH', 'resources.dotnet'),
            game: text(resources.game === undefined ? 'GI' : resources.game, 'resources.game'),
            luaRoot: setting(resources.luaRoot, 'GENSHIN_LUA_PATH', 'resources.luaRoot') || path.join(resourceRoot, 'lua'),
            imageRoots: [...new Set([...imageRoots, path.join(resourceRoot, 'images')])],
            caches: Object.fromEntries(resourceKeys.map((key, index) => [key, setting(caches[key], resourceEnv[index], `resources.caches.${key}`)]).filter(([, value]) => value))},
        cache: {root, resources: resourceRoot,
            exports: setting(cache.exports, 'WIKI_DATA_CACHE', 'cache.exports') || (env.GENSHIN_DATA_CACHE && path.resolve(cwd, env.GENSHIN_DATA_CACHE)) || path.join(root, 'genshin-data'),
            indexes: setting(cache.indexes, 'WIKI_DATA_INDEX_CACHE', 'cache.indexes') || (env.GENSHIN_DB_CACHE && path.resolve(cwd, env.GENSHIN_DB_CACHE)) || path.join(root, 'genshin-db')},
        output: {data: setting(output.data, 'WIKI_DATA_OUTPUT', 'output.data') || path.join(base, 'data'),
            assets: resolve(output.assets, 'output.assets') || path.join(ROOT, 'assets')},
        query: {snapshot, prepare, backend},
        upload: {url: uploadUrl, tokenEnv, timeoutMs},
    });
    const preparedFile = path.join(resourceRoot, 'prepared.json');
    if (fs.existsSync(preparedFile)) {
        const prepared = JSON.parse(fs.readFileSync(preparedFile, 'utf8'));
        if (prepared.schema !== 1 || !prepared.caches || typeof prepared.caches !== 'object') throw new Error(`Invalid prepared resource references: ${preparedFile}`);
        // References are scoped to one external installation; source-content hashes
        // are subsequently checked by the upstream provider, not interpreted here.
        if (prepared.sourceRoot === config.source.root && prepared.assetMap === config.resources.assetMap) {
            object(prepared.caches, resourceKeys, 'prepared.caches');
            for (const [key, value] of Object.entries(prepared.caches)) {
                if (!path.isAbsolute(text(value, `prepared.caches.${key}`))) throw new Error(`Prepared cache path must be absolute: ${value}`);
                config.resources.caches[key] ||= value;
            }
        }
    }
    return config;
}
function configEnvironment(config) {
    return {
        WIKI_DATA_CONFIG: config.configFile || '', WIKI_CACHE_ROOT: config.cache.root,
        WIKI_DATA_OUTPUT: config.output.data, WIKI_DATA_CACHE: config.cache.exports, WIKI_DATA_INDEX_CACHE: config.cache.indexes,
        GENSHIN_DATA_SOURCE: config.source.root || '', GENSHIN_HISTORY_REFS: config.source.historyRefs.join(','),
        GENSHIN_HISTORY_SEED: config.source.historySeedCache || '', GENSHIN_LUA_PATH: config.resources.luaRoot,
        WIKI_IMAGE_ROOTS: config.resources.imageRoots.join(path.delimiter),
        WIKI_DATA_BACKEND: config.query.backend, WIKI_DATA_PREPARE: config.query.prepare ? '1' : '0', WIKI_DATA_SNAPSHOT: config.query.snapshot || '',
        ...Object.fromEntries(resourceKeys.map((key, index) => [resourceEnv[index], config.resources.caches[key] || ''])),
    };
}
module.exports = {loadConfig, configEnvironment, resourceKeys};
