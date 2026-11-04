import path from 'node:path';

let output = path.resolve(process.env.WIKI_DATA_OUTPUT || path.join(__dirname, '../../data'));
export function get_output_root() { return output; }
export function set_output_root(directory: string) { output = path.resolve(directory); }
