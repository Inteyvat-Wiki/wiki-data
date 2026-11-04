import { createRequire } from 'node:module';
const { initialize_genshin } = createRequire(import.meta.url)('../src/utils/genshin.ts');
await initialize_genshin();
