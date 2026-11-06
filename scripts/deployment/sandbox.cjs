#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {GUEST, GUID, validateLock, readJSON, writeJSON, hashFile, verifyFile, noLinks, configuration} = require('./sandbox-common.cjs');
const executeFile = promisify(execFile);
const FILES = ['bootstrap-sandbox.ps1', 'sandbox-common.cjs', 'sandbox-guest.cjs'];
const HELP = `Windows Sandbox export deployment (no upload, publish, or implicit latest)
  node scripts/deployment/sandbox.cjs plan --lock LOCK.json
  node scripts/deployment/sandbox.cjs list
  node scripts/deployment/sandbox.cjs start --lock LOCK.json --runs NEW_RUN_PARENT
  node scripts/deployment/sandbox.cjs exec --run RUN_DIRECTORY
  node scripts/deployment/sandbox.cjs share --run RUN_DIRECTORY
  node scripts/deployment/sandbox.cjs stop --run RUN_DIRECTORY
start creates ONE new sandbox and shares only its input/output directories; it does not run the guest.
exec explicitly runs the guest and waits. Read output/logs and output/result.json for progress/result.
Always stop your own run afterwards. No cleanup/delete command; all reports are retained.
plan never starts a sandbox or downloads files. See docs/sandbox-deployment.md for the input lock.
`;
function parse(args) {
    const [command = 'help', ...rest] = args, result = {command};
    const allowed = {plan: ['lock'], list: [], start: ['lock', 'runs'], exec: ['run'], share: ['run'], stop: ['run'], help: [], '--help': []};
    assert(Object.hasOwn(allowed, command), `Unknown command: ${command}`);
    for (let i = 0; i < rest.length; i++) {
        const key = rest[i].slice(2);
        assert(rest[i].startsWith('--') && allowed[command].includes(key) && !result[key], `Unknown/duplicate option: ${rest[i]}`);
        assert(rest[i + 1] && !rest[i + 1].startsWith('--'), 'Missing option value');
        result[key] = path.resolve(rest[++i]);
    }
    for (const key of allowed[command]) assert(result[key], `Missing --${key}`);
    return result;
}
async function wsb(args) {
    assert.equal(process.platform, 'win32', 'Windows Sandbox host must be Windows');
    const result = await executeFile('wsb.exe', [...args, '--raw'], {encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024});
    return result.stdout.trim() ? JSON.parse(result.stdout.replace(/^\uFEFF/, '')) : {};
}
function environments(result) {
    // Fail closed if Microsoft changes the machine-readable contract.
    assert(Array.isArray(result.WindowsSandboxEnvironments), 'Unexpected wsb list JSON; inspect wsb list --raw before proceeding');
    return result.WindowsSandboxEnvironments;
}
function environmentId(item) {
    // CLI versions have used Id and SandboxId; accept only one unambiguous GUID.
    const ids = ['Id', 'ID', 'SandboxId', 'SandboxID', 'id'].filter(key => GUID.test(item[key] || '')).map(key => item[key].toLowerCase());
    assert(ids.length && new Set(ids).size === 1, 'Unknown/ambiguous sandbox identity; refuse to operate');
    return ids[0];
}
async function prepareRun(lockFile, parent) {
    const lock = validateLock(readJSON(lockFile));
    assert(path.resolve(parent) !== path.parse(path.resolve(parent)).root, 'Do not use a filesystem root as the run parent');
    noLinks(parent); fs.mkdirSync(parent, {recursive: true});
    const directory = fs.mkdtempSync(path.join(parent, 'sandbox-'));
    const input = path.join(directory, 'input'), output = path.join(directory, 'output');
    fs.mkdirSync(input); fs.mkdirSync(output);
    const copied = structuredClone(lock);
    // Only explicitly listed, hash-checked sample files are copied. Never share their original directory.
    const localBytes = (lock.resources?.files || []).filter(file => file.input).reduce((sum, file) => sum + file.bytes, 0);
    assert(localBytes <= 512 * 1024 * 1024, 'Local sample inputs exceed 512 MiB; use explicit download inputs for larger runs');
    for (const file of copied.resources?.files || []) if (file.input) {
        const source = path.resolve(path.dirname(lockFile), file.input);
        await verifyFile(source, file);
        const destination = path.join(input, 'resources', file.path);
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
        await verifyFile(destination, file); file.input = 'resources/' + file.path;
    }
    writeJSON(path.join(input, 'lock.json'), copied);
    const bootstrapHashes = {};
    for (const file of FILES) {
        fs.copyFileSync(path.join(__dirname, file), path.join(input, file), fs.constants.COPYFILE_EXCL);
        bootstrapHashes[file] = await hashFile(path.join(input, file));
    }
    const id = randomUUID();
    writeJSON(path.join(input, 'run.json'), {schema: 1, id, lockSha256: await hashFile(path.join(input, 'lock.json')), bootstrapHashes});
    const state = {schema: 1, owner: 'inteyvat-wiki-data-sandbox', id, created: false, directory,
        lockSha256: await hashFile(path.join(input, 'lock.json')), startedAt: new Date().toISOString()};
    writeJSON(path.join(directory, 'host-state.json'), state);
    return state;
}
function loadState(directory) {
    noLinks(directory);
    const state = readJSON(path.join(directory, 'host-state.json'));
    assert(state.schema === 1 && state.owner === 'inteyvat-wiki-data-sandbox' && GUID.test(state.id), 'Not a managed sandbox run');
    assert.equal(path.resolve(state.directory), path.resolve(directory), 'Run moved; refuse to use its ownership record');
    assert.equal(readJSON(path.join(directory, 'input/run.json')).id, state.id, 'Run identity mismatch');
    assert(state.created === true && !state.stoppedAt, 'This run does not own an active sandbox');
    return state;
}
function saveState(state) {
    // This file is outside both guest shares; guest output cannot replace our ownership evidence.
    const temporary = path.join(state.directory, `state-${randomUUID()}.json`);
    writeJSON(temporary, state); fs.renameSync(temporary, path.join(state.directory, 'host-state.json'));
}
async function active(state, call = wsb) {
    const sessions = environments(await call(['list']));
    assert(sessions.some(item => environmentId(item) === state.id.toLowerCase()), 'Owned sandbox is not running; refuse to adopt another');
}
async function share(state, call = wsb) {
    await active(state, call);
    for (const [name, guest, writable] of [['input', GUEST.input, false], ['output', GUEST.output, true]]) {
        const host = path.join(state.directory, name); noLinks(host);
        await call(['share', '--id', state.id, '--host-path', host, '--sandbox-path', guest, ...(writable ? ['--allow-write'] : [])]);
    }
}
async function start(lockFile, parent, call = wsb) {
    assert.equal(environments(await call(['list'])).length, 0, 'A user sandbox already exists; it will not be reused or stopped');
    const state = await prepareRun(lockFile, parent);
    try {
        const reply = await call(['start', '--id', state.id, '--config', configuration(readJSON(lockFile).memoryMB)]);
        writeJSON(path.join(state.directory, 'start-response.json'), reply);
        await active(state, call); // Claim only after successful start AND matching enumeration.
        state.created = true; saveState(state);
        await share(state, call);
        return state;
    } catch (error) {
        // Never infer ownership after a failed/ambiguous start, and never stop all sessions.
        if (state.created) {
            try { await stop(state.directory, call); }
            catch { error.message += `; own sandbox may still be running, inspect ${state.directory}`; }
        }
        error.message += ` (run retained: ${state.directory})`; throw error;
    }
}
async function stop(directory, call = wsb) {
    const state = loadState(directory);
    await active(state, call);
    await call(['stop', '--id', state.id]);
    state.stoppedAt = new Date().toISOString(); saveState(state);
    return {stopped: state.id, directory};
}
async function execute(directory, call = wsb) {
    const state = loadState(directory);
    await active(state, call);
    assert.equal(await hashFile(path.join(directory, 'input/lock.json')), state.lockSha256, 'Lock changed after start');
    const output = path.join(directory, 'output');
    assert(!fs.existsSync(path.join(output, 'execution.json')), 'One execution per run; create a clean sandbox to retry');
    writeJSON(path.join(output, 'execution.json'), {id: state.id, startedAt: new Date().toISOString()});
    const command = `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ${GUEST.input}\\bootstrap-sandbox.ps1`;
    const reply = await call(['exec', '--id', state.id, '--run-as', 'System', '--command', command]);
    writeJSON(path.join(directory, 'exec-response.json'), reply);
    assert.equal(reply.ExitCode, 0, 'Guest launcher failed or returned no exit code; inspect the bootstrap log');
    // CLI exit status alone is insufficient; it might only confirm process creation.
    const result = readJSON(path.join(output, 'result.json'));
    assert.equal(result.id, state.id, 'Guest result identity mismatch');
    assert.equal(result.lockSha256, state.lockSha256, 'Guest result lock mismatch');
    assert.equal(result.status, 'passed', 'Guest failed; see output/result.json and output/logs');
    return result;
}
async function main(args = process.argv.slice(2)) {
    const options = parse(args);
    let result;
    if (['help', '--help'].includes(options.command)) { console.log(HELP); return; }
    if (options.command === 'plan') {
        const lock = validateLock(readJSON(options.lock));
        result = {valid: true, node: lock.tools.node.version, mode: lock.job.mode, versions: lock.job.versions,
            source: lock.repositories.source.commit, repositories: Object.fromEntries(Object.entries(lock.repositories).map(([name, repo]) => [name, repo.commit])),
            downloadTools: Object.keys(lock.tools), resources: lock.resources?.files.length || 0,
            publish: false, note: 'No sandbox started. Smoke/subset output is not a complete production release.'};
    } else if (options.command === 'list') result = await wsb(['list']);
    else if (options.command === 'start') result = await start(options.lock, options.runs);
    else if (options.command === 'exec') result = await execute(options.run);
    else if (options.command === 'stop') result = await stop(options.run);
    else { await share(loadState(options.run)); result = {shared: options.run}; }
    console.log(JSON.stringify(result, null, 2));
}
module.exports = {parse, environments, environmentId, prepareRun, loadState, share, start, stop, execute, main};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
