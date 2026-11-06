import { loadConfig } from '../../config/pipeline.cjs';

// Resolve once per export, including image/output paths, before opening a snapshot.
export const pipeline_config = loadConfig();
