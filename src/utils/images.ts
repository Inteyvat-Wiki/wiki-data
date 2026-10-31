import fs from 'node:fs';
import path from 'node:path';

function measure(file: string) {
    const header = Buffer.alloc(24), handle = fs.openSync(file, 'r');
    try {
        if (fs.readSync(handle, header, 0, 24, 0) !== 24) throw new Error(`Truncated image header: ${file}`);
    } finally { fs.closeSync(handle); }
    if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || header.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`Invalid image header: ${file}`);
    const width = header.readUInt32BE(16), height = header.readUInt32BE(20);
    if (!width || !height || width > 16384 || height > 16384) throw new Error(`Invalid image dimensions: ${file}`);
    return { pixels: width * height, bytes: fs.statSync(file).size };
}
export function prefer_image(candidate: string, current: string): boolean {
    const next = measure(candidate), previous = measure(current);
    return next.pixels > previous.pixels || next.pixels === previous.pixels
        && (next.bytes > previous.bytes || next.bytes === previous.bytes && candidate < current);
}
export function image_basename(reference: string): string {
    return path.posix.basename(reference.replaceAll('\\', '/')).replace(/\.(?:png|tga|jpe?g)$/i, '');
}

/** One source index and output-scoped collision registry for every exporter. */
export class ImageStore {
    private index?: Map<string, string>;
    private copied = new Map<string, string>();
    readonly failures = new Set<string>();
    constructor(private source: string, private defaultOutput: string) {}
    private resolve(reference: string) {
        if (!this.index) {
            this.index = new Map();
            for (const relative of fs.readdirSync(this.source, { recursive: true }) as string[]) {
                if (!/\.png$/i.test(relative)) continue;
                const file = path.join(this.source, relative), name = path.parse(relative).name;
                try {
                    measure(file);
                    const previous = this.index.get(name);
                    if (!previous || prefer_image(file, previous)) this.index.set(name, file);
                } catch { this.failures.add(file); }
            }
        }
        return this.index.get(image_basename(reference));
    }
    fromName(reference: string | undefined, relative: string, output = this.defaultOutput): string | null {
        if (!reference) { this.failures.add(relative); return null; }
        const file = this.resolve(reference);
        if (!file) { this.failures.add(reference); return null; }
        return this.fromPath(file, relative, output);
    }
    fromPath(file: string | null, relative: string, output = this.defaultOutput): string | null {
        const root = path.resolve(output, 'images');
        relative = relative.replaceAll('\\', '/');
        if (!relative.endsWith('.png')) relative += '.png';
        const requested = path.resolve(root, relative);
        if (!requested.startsWith(root + path.sep) || /[<>:"|?*\x00-\x1f]/.test(relative)) throw new Error(`Invalid image output: ${relative}`);
        if (!file) { this.failures.add(relative); return null; }
        file = path.resolve(file);
        let target = requested, suffix = 0;
        while (this.copied.has(target) && this.copied.get(target) !== file) {
            target = requested.replace(/\.png$/, `_${++suffix}.png`);
        }
        try {
            // Re-copy on a new generation, even when the registry remembers the name.
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.copyFileSync(file, target);
            this.copied.set(target, file);
            return '/images/' + path.relative(root, target).split(path.sep).join('/');
        } catch { this.failures.add(file); return null; }
    }
}
export const images = new ImageStore(path.resolve(__dirname, '../images'), path.resolve(__dirname, '../../data'));
