'use strict';
// Read-only exhaustive detail endpoint check. No credentials, writes or retries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {CONTENT_CATEGORIES} = require('@inteyvat-wiki/wiki-contracts/registry');
const {isWikiId} = require('@inteyvat-wiki/wiki-contracts/ids');

function requests(root) {
    return CONTENT_CATEGORIES.flatMap(category => {
        const ids = JSON.parse(fs.readFileSync(path.join(root, 'common', category, 'ids.json'), 'utf8'));
        assert(Array.isArray(ids) && ids.every(isWikiId) && new Set(ids).size === ids.length, `Invalid index: ${category}`);
        const route = ['serenitea', 'tcg', 'miliastra'].includes(category) ? `archive/${category}` : category.replaceAll('_', '-');
        return ids.flatMap(id => ['zh_hans', 'en'].map(lang => ({category, id, lang,
            route: `/api/${route}/${encodeURIComponent(id)}?lang=${lang}`})));
    });
}

async function verify(base, jobs, fetcher = fetch) {
    const started = Date.now(), categories = {}, failures = [];
    let next = 0, checked = 0, failed = 0;
    async function worker() {
        while (next < jobs.length) {
            const job = jobs[next++];
            const count = categories[job.category] ||= {checked: 0, failed: 0};
            try {
                const response = await fetcher(new URL(job.route, base), {redirect: 'error', signal: AbortSignal.timeout(60000)});
                if (response.status !== 200) {
                    await response.body?.cancel();
                    throw new Error(`HTTP ${response.status}`);
                }
                assert.match(response.headers.get('content-type') || '', /application\/json/, 'Expected JSON');
                const value = await response.json();
                assert(value && typeof value === 'object' && !Array.isArray(value)
                    && (typeof value.name === 'string' || (job.category === 'task' && value.name === null)), 'Invalid detail response');
            } catch (error) {
                count.failed++; failed++;
                // Report data IDs, not arbitrary response bodies or error stacks.
                if (failures.length < 100) failures.push({...job, error: /^HTTP \d+$/.test(error.message) ? error.message : 'Request or response validation failed'});
            }
            count.checked++; checked++;
            if (checked % 1000 === 0) console.error(`Details checked: ${checked}/${jobs.length}; failed: ${failed}`);
        }
    }
    await Promise.all(Array.from({length: Math.min(4, jobs.length)}, worker));
    return {scope: 'all-indexed-details-both-languages', checked, failed, durationMs: Date.now() - started,
        categories, failures, failuresTruncated: failed > failures.length};
}

async function main(args = process.argv.slice(2)) {
    assert.equal(args.length, 2, 'Usage: verify-details.cjs BASE_URL EXPORT_ROOT');
    const base = new URL(args[0]), root = fs.realpathSync(args[1]);
    assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search
        && !base.hash && base.pathname === '/', 'Use a credential-free origin');
    const report = await verify(base, requests(root));
    console.log(JSON.stringify({origin: base.origin, exportRoot: root, ...report}, null, 2));
    if (report.failed) throw new Error(`${report.failed} detail requests failed`);
    return report;
}
module.exports = {main, requests, verify};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
