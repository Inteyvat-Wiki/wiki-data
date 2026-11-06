'use strict';
// Publish only generated JSON/PNG, never provider caches or raw game input.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const {Readable} = require('node:stream');
const {spawnSync} = require('node:child_process');
const contract = require('@inteyvat-wiki/wiki-contracts/upload');
const {validateExports} = require('./check_exports.cjs');

function endpoint(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Configure upload.url or WIKI_UPLOAD_URL with the upload endpoint'); }
    if (url.username || url.password || url.search || url.hash) throw new Error('Upload URL must not contain credentials, query parameters or a fragment');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
        throw new Error('Uploads require HTTPS; plain HTTP is allowed only for loopback testing');
    if (!url.pathname.endsWith('/api/admin/data')) throw new Error('Upload endpoint must end with /api/admin/data');
    return url;
}
function snapshotStat(info) {
    return {size: info.size, mtime: info.mtimeMs, ctime: info.ctimeMs, ino: info.ino, dev: info.dev};
}
function sameStat(a, b) { return Object.keys(a).every(key => a[key] === b[key]); }
function inventory(root) {
    if (fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory()) throw new Error('Upload root must be a regular directory');
    const result = [];
    const visit = (directory, prefix) => {
        for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
            const relative = prefix + entry.name, file = path.join(directory, entry.name), info = fs.lstatSync(file);
            if (info.isSymbolicLink()) throw new Error(`Symlink in upload input: ${relative}`);
            if (info.isDirectory()) visit(file, relative + '/');
            else if (info.isFile()) {
                if (!contract.isUploadPath(relative)) throw new Error(`File is not publishable JSON/PNG: ${relative}`);
                result.push({path: relative, file, stat: snapshotStat(info)});
            } else throw new Error(`Non-regular upload input: ${relative}`);
        }
    };
    visit(root, '');
    return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function verifyInventory(plan) {
    const current = inventory(plan.root);
    if (current.length !== plan.entries.length || current.some((entry, index) => entry.path !== plan.entries[index].path || !sameStat(entry.stat, plan.entries[index].stat)))
        throw new Error('Export changed while preparing/uploading; publish a completed, immutable export directory');
}
async function openInput(entry) {
    if (fs.lstatSync(entry.file).isSymbolicLink()) throw new Error(`Input became a symlink: ${entry.path}`);
    const file = await fsp.open(entry.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const info = await file.stat();
    if (!info.isFile() || !sameStat(entry.stat, snapshotStat(info))) {
        await file.close(); throw new Error(`Input changed: ${entry.path}`);
    }
    return file;
}
async function hashInput(entry) {
    const file = await openInput(entry), hash = crypto.createHash('sha256');
    let size = 0;
    try {
        for await (const chunk of file.createReadStream({autoClose: false})) {
            size += chunk.length;
            if (size > entry.stat.size) throw new Error(`Input changed: ${entry.path}`);
            hash.update(chunk);
        }
        if (size !== entry.stat.size || !sameStat(entry.stat, snapshotStat(await file.stat()))) throw new Error(`Input changed: ${entry.path}`);
        return hash.digest('hex');
    } finally { await file.close(); }
}
function validateDataset(root) {
    const report = validateExports(root);
    if (report.errors.length) throw new Error(`Export validation failed (${report.errors.length} errors): ${report.errors.slice(0, 3).map(item => `${item.path}: ${item.message}`).join('; ')}`);
    const checked = spawnSync(process.execPath, ['--import', 'tsx', path.join(__dirname, 'check_map_export.ts'), root], {
        cwd: path.resolve(__dirname, '..'), encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024,
    });
    if (checked.error || checked.status !== 0) throw new Error('Map export validation failed; run npm run check:maps:export -- <output> for details');
}
async function buildManifest(directory, limits = contract.DEFAULT_UPLOAD_LIMITS) {
    const root = path.resolve(directory), entries = inventory(root);
    if (!entries.length || entries.length > limits.maxFiles) throw new Error('Upload file count exceeds the protocol limit');
    const files = [], manifest = {schema: 1, files, totalBytes: 0};
    for (const entry of entries) {
        if (entry.stat.size <= 0 || entry.stat.size > limits.maxFileBytes) throw new Error(`Invalid/excessive upload file size: ${entry.path}`);
        manifest.totalBytes += entry.stat.size;
        if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes > limits.maxTotalBytes) throw new Error('Upload total size exceeds the protocol limit');
        files.push({path: entry.path, size: entry.stat.size, sha256: await hashInput(entry)});
    }
    const error = contract.getUploadManifestError(manifest, limits);
    if (error) throw new Error(`Invalid upload manifest: ${error}`);
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    if (manifestBytes.length > limits.maxManifestBytes) throw new Error('Upload manifest is too large');
    const plan = {root, entries, manifest, manifestBytes, releaseId: crypto.createHash('sha256').update(manifestBytes).digest('hex')};
    verifyInventory(plan);
    return plan;
}
async function* bundle(plan) {
    verifyInventory(plan);
    const length = Buffer.alloc(4); length.writeUInt32BE(plan.manifestBytes.length);
    yield Buffer.from(contract.DATA_UPLOAD_MAGIC); yield length; yield plan.manifestBytes;
    for (let index = 0; index < plan.entries.length; index++) {
        const entry = plan.entries[index], file = await openInput(entry), hash = crypto.createHash('sha256');
        let size = 0;
        try {
            for await (const chunk of file.createReadStream({autoClose: false})) {
                // Never let a growing file supply bytes for the next file or completion trailer.
                if (chunk.length > plan.manifest.files[index].size - size) throw new Error(`Input changed during upload: ${entry.path}`);
                hash.update(chunk); size += chunk.length; yield chunk;
            }
            if (size !== plan.manifest.files[index].size || hash.digest('hex') !== plan.manifest.files[index].sha256
                || !sameStat(entry.stat, snapshotStat(await file.stat()))) throw new Error(`Input changed during upload: ${entry.path}`);
        } finally { await file.close(); }
    }
    verifyInventory(plan);
    // Server cannot publish merely because the last file's bytes have arrived.
    yield Buffer.from(plan.releaseId, 'hex');
}
function request(url, {method, token, headers = {}, body, timeoutMs = 1800000}) {
    return new Promise((resolve, reject) => {
        let source, settled = false, timer;
        const finish = (error, value) => {
            if (settled) return; settled = true; clearTimeout(timer);
            source?.destroy();
            if (error) reject(error); else resolve(value);
        };
        const req = (url.protocol === 'https:' ? https : http).request(url, {
            method, rejectUnauthorized: true, headers: {...headers, Authorization: `Bearer ${token}`, Accept: 'application/json'},
        }, res => {
            const chunks = []; let bytes = 0;
            res.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > 64 * 1024) { finish(new Error('Upload server response exceeded its limit')); req.destroy(); res.destroy(); }
                else chunks.push(chunk);
            });
            res.on('error', () => finish(new Error('Upload response was interrupted')));
            res.on('end', () => {
                if (res.statusCode !== 200 && res.statusCode !== 201) {
                    finish(new Error(`Upload request failed: HTTP ${res.statusCode} (redirects are not followed)`)); req.destroy(); return;
                }
                if (body && !req.writableFinished) { finish(new Error('Upload server replied before the request completed')); req.destroy(); return; }
                try { finish(undefined, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
                catch { finish(new Error('Upload server returned invalid JSON')); }
            });
        });
        req.on('error', error => finish(new Error(`Upload connection failed${error.code ? ` (${error.code})` : ''}`)));
        req.setTimeout(Math.min(timeoutMs, 60000), () => { finish(new Error('Upload connection timed out')); req.destroy(); });
        timer = setTimeout(() => { finish(new Error('Upload exceeded its total timeout')); req.destroy(); }, timeoutMs);
        if (body) {
            // The complete request may still need substantial validation/fsync on
            // the server. Keep the absolute deadline, not a network-idle deadline,
            // while waiting for the commit receipt after all bytes were sent.
            req.once('finish', () => req.setTimeout(0));
            source = Readable.from(body);
            source.on('error', error => { finish(error); req.destroy(); });
            source.pipe(req);
        } else req.end();
    });
}
function credentials(options, env = process.env) {
    const token = env[options.tokenEnv || 'WIKI_UPLOAD_TOKEN'];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error(`Set ${options.tokenEnv || 'WIKI_UPLOAD_TOKEN'} to a 32-byte random token encoded as 64 lowercase hex characters`);
    return token;
}
async function uploadPlan(plan, options, env = process.env) {
    const url = endpoint(options.url), token = credentials(options, env);
    const status = await request(url, {method: 'GET', token, timeoutMs: options.timeoutMs});
    if (!contract.isUploadStatus(status)) throw new Error('Upload server returned an incompatible status');
    const invalid = contract.getUploadManifestError(plan.manifest, status.limits);
    if (invalid || plan.manifestBytes.length > status.limits.maxManifestBytes) throw new Error('Dataset exceeds server limits or is incompatible with its protocol');
    const contentLength = Buffer.byteLength(contract.DATA_UPLOAD_MAGIC) + 4 + plan.manifestBytes.length + plan.manifest.totalBytes + contract.DATA_UPLOAD_TRAILER_BYTES;
    const result = await request(url, {method: 'POST', token, timeoutMs: options.timeoutMs,
        headers: {'Content-Type': contract.DATA_UPLOAD_CONTENT_TYPE, 'Content-Length': String(contentLength), 'x-wiki-base-release': status.releaseId || 'none'}, body: bundle(plan)});
    if (!contract.isUploadResult(result) || result.releaseId !== plan.releaseId || result.fileCount !== plan.manifest.files.length || result.totalBytes !== plan.manifest.totalBytes)
        throw new Error('Upload response did not confirm the exact published dataset; inspect server status before retrying');
    return result;
}
async function publish(config, apply = false) {
    if (config.upload.url) endpoint(config.upload.url);
    if (apply && !config.upload.url) throw new Error('Configure upload.url or WIKI_UPLOAD_URL');
    if (apply) credentials(config.upload);
    validateDataset(config.output.data);
    const plan = await buildManifest(config.output.data);
    if (!apply) return {mode: 'preview', endpoint: config.upload.url, files: plan.manifest.files.length, totalBytes: plan.manifest.totalBytes,
        releaseId: plan.releaseId, note: 'No network request. Use upload --apply to publish this full export.'};
    return uploadPlan(plan, config.upload);
}
module.exports = {endpoint, inventory, buildManifest, bundle, uploadPlan, validateDataset, publish};
