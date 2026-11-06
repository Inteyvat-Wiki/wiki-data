export type ResourceCacheKey = 'miliastra' | 'profileFrames' | 'maps' | 'mapIcons' | 'worldAreas' | 'mapAreaConfigs' | 'mapBase' | 'mapFog' | 'mapEffects' | 'mapLimitOutlines' | 'levelTags';
export interface PipelineConfig {
    configFile?: string;
    source: {root?: string; historyRefs: string[]; historySeedCache?: string; versions: boolean; versionOverrides: Record<string, string>};
    resources: {studio?: string; assetMap?: string; root?: string; dotnet?: string; game: string; luaRoot: string;
        imageRoots: string[]; caches: Partial<Record<ResourceCacheKey, string>>};
    cache: {root: string; exports: string; indexes: string; resources: string};
    output: {data: string; assets: string};
    query: {snapshot?: string; prepare: boolean; backend: 'snapshot' | 'legacy'};
    upload: {url?: string; tokenEnv: string; timeoutMs: number};
}
export function loadConfig(options?: {file?: string; cwd?: string; env?: NodeJS.ProcessEnv}): PipelineConfig;
export function configEnvironment(config: PipelineConfig): NodeJS.ProcessEnv;
export const resourceKeys: ResourceCacheKey[];
