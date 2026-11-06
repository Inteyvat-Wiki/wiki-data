#!/usr/bin/env node
'use strict';
// Explicit, temporary transport only: no credentials, source cache, or TLS termination.
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');

function privateIPv4(value) {
    if (net.isIP(value) !== 4) return false;
    const [a, b] = value.split('.').map(Number);
    return a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168;
}
function port(value) {
    assert(/^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 65535, 'Invalid port');
    return Number(value);
}
function createRelay({peer, upstreamPort, idleMs = 120000}) {
    assert(net.isIP(peer) === 4, 'One explicit IPv4 peer is required');
    port(upstreamPort);
    const sockets = new Set();
    const track = socket => {
        sockets.add(socket); socket.once('close', () => sockets.delete(socket));
        socket.on('error', () => socket.destroy());
        socket.setTimeout(idleMs, () => socket.destroy());
        return socket;
    };
    const server = http.createServer({maxHeaderSize: 8192, headersTimeout: 15000}, (_request, response) => {
        response.writeHead(403, {connection: 'close'}); response.end();
    });
    server.on('connection', socket => {
        if (socket.remoteAddress !== peer || sockets.size >= 32) { socket.destroy(); return; }
        track(socket);
    });
    server.on('connect', (request, client, head) => {
        if (client.remoteAddress !== peer || request.url !== 'github.com:443'
            || request.headers.authorization || request.headers['proxy-authorization'] || head.length) {
            client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
        }
        const upstream = track(net.connect({host: '127.0.0.1', port: Number(upstreamPort)}));
        client.once('close', () => upstream.destroy()); upstream.once('close', () => client.destroy());
        upstream.once('connect', () => upstream.write('CONNECT github.com:443 HTTP/1.1\r\nHost: github.com:443\r\n\r\n'));
        let pending = Buffer.alloc(0);
        const handshake = setTimeout(() => upstream.destroy(), 15000);
        upstream.once('close', () => clearTimeout(handshake));
        function receive(chunk) {
            pending = Buffer.concat([pending, chunk]);
            const end = pending.indexOf('\r\n\r\n');
            if (pending.length > 8192 || end !== -1 && !/^HTTP\/1\.[01] 200(?: |\r)/.test(pending.toString('latin1'))) {
                client.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'); upstream.destroy(); return;
            }
            if (end === -1) return;
            clearTimeout(handshake); upstream.off('data', receive);
            client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            if (pending.length > end + 4) client.write(pending.subarray(end + 4));
            upstream.pipe(client); client.pipe(upstream);
        }
        upstream.on('data', receive);
    });
    server.on('clientError', (_error, socket) => socket.destroy());
    return {server, close: () => new Promise(resolve => {
        for (const socket of sockets) socket.destroy();
        server.close(resolve);
    })};
}
async function main(args = process.argv.slice(2)) {
    assert.equal(args.length, 4, 'Usage: sandbox-git-proxy.cjs PRIVATE_BIND_IP PORT ONE_GUEST_IP LOOPBACK_PROXY_PORT');
    const [host, listenPort, peer, upstreamPort] = args;
    assert(privateIPv4(host) && privateIPv4(peer) && host !== peer, 'Use distinct private host/guest IPv4 addresses');
    assert(Object.values(os.networkInterfaces()).flat().some(item => item?.address === host && !item.internal), 'Bind address must belong to a local private interface');
    const relay = createRelay({peer, upstreamPort: port(upstreamPort)});
    await new Promise((resolve, reject) => { relay.server.once('error', reject); relay.server.listen(port(listenPort), host, resolve); });
    console.log(JSON.stringify({listening: `${host}:${listenPort}`, peer, destination: 'github.com:443', upstream: `127.0.0.1:${upstreamPort}`, maxLifetimeMinutes: 60}));
    const lifetime = setTimeout(stop, 60 * 60 * 1000);
    let stopping = false;
    async function stop() {
        if (stopping) return; stopping = true; clearTimeout(lifetime);
        await relay.close(); console.log('Temporary Git relay closed.');
    }
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
module.exports = {privateIPv4, port, createRelay, main};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
