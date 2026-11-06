'use strict';
// Run on the destination through SSH. The bearer token never crosses plaintext networks.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const http = require('node:http');
const {pipeline} = require('node:stream');

function publicError(body) {
    // Only known, fixed server messages may be logged. Never echo arbitrary
    // response bodies, headers, paths, or credentials on an error response.
    const allowed = new Set(['Missing or invalid dataset image', 'Invalid UTF-8 JSON',
        'Invalid PNG header', 'Invalid PNG header or ending', 'File checksum mismatch',
        'Invalid dataset structure', 'Truncated upload', 'Unexpected upload bytes',
        'Upload timed out', 'Upload connection interrupted', 'Dataset publication failed',
        'Another upload is in progress', 'Base release changed', 'Missing image override is disabled', 'Invalid missing image override']);
    try { const message = JSON.parse(body).message; return allowed.has(message) ? ` (${message})` : ''; }
    catch { return ''; }
}

async function main(args = process.argv.slice(2)) {
    const allowMissingImages = args.length === 3 && args[2] === '--allow-missing-images';
    assert(args.length === 2 || allowMissingImages, 'Usage: linux-upload-bundle.cjs BUNDLE EXPECTED_RELEASE_SHA256 [--allow-missing-images]');
    const [filename, expected] = args;
    assert(/^[a-f0-9]{64}$/.test(expected), 'Expected release SHA-256 is required');
    assert(fs.statSync(filename).isFile() && !fs.lstatSync(filename).isSymbolicLink(), 'Regular bundle file required');
    const config = fs.readFileSync('/etc/inteyvat-wiki/environment', 'utf8');
    const token = /^WIKI_UPLOAD_TOKEN=([a-f0-9]{64})$/m.exec(config)?.[1];
    assert(token, 'Upload token is missing');
    const url = 'http://127.0.0.1:4780/api/admin/data';
    const status = await fetch(url, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(10000)});
    assert(status.ok, `Upload status failed: ${status.status}`);
    const current = await status.json();
    const result = await new Promise((resolve, reject) => {
        const request = http.request(url, {method: 'POST', headers: {
            Authorization: `Bearer ${token}`,
            'content-type': 'application/vnd.inteyvat-wiki.data-bundle',
            'content-length': fs.statSync(filename).size,
            'x-wiki-base-release': current.releaseId || 'none',
            ...(allowMissingImages ? {'x-wiki-allow-missing-images': '1'} : {}),
        }}, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', part => { body += part; if (body.length > 65536) response.destroy(new Error('Excessive response')); });
            response.on('error', reject);
            response.on('end', () => {
                if (response.statusCode !== 200) return reject(new Error(`Upload failed: HTTP ${response.statusCode}${publicError(body)}`));
                try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid upload response')); }
            });
        });
        request.setTimeout(120000, () => request.destroy(new Error('Upload idle timeout')));
        // Final server validation and durable commit do not produce network bytes.
        // They remain bounded by the total deadline below.
        request.once('finish', () => request.setTimeout(0));
        const deadline = setTimeout(() => request.destroy(new Error('Upload total timeout')), 35 * 60 * 1000);
        request.on('close', () => clearTimeout(deadline));
        request.on('error', reject);
        pipeline(fs.createReadStream(filename), request, error => {if (error) reject(error);});
    });
    assert.equal(result.releaseId, expected, 'Server published a different release');
    console.log(JSON.stringify(result));
}
module.exports = {main, publicError};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
