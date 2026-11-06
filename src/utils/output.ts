import path from 'node:path';
import { pipeline_config } from './config';

let output = pipeline_config.output.data;
export function get_output_root() { return output; }
export function set_output_root(directory: string) { output = path.resolve(directory); }
