'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const {privateIPv4, port, createRelay} = require('./sandbox-git-proxy.cjs');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
function request(port, bytes, allowReset = false) {
    return new Promise((resolve, reject) => {
        const socket = net.connect({host: '127.0.0.1', port}, () => socket.write(bytes));
        socket.setTimeout(2000, () => {socket.destroy(); reject(new Error('Test timeout'));});
        socket.on('error', error => allowReset && error.code === 'ECONNRESET' ? resolve('') : reject(error));
        socket.on('data', data => {socket.destroy(); resolve(data.toString());});
        socket.on('close', () => resolve(''));
    });
}
test('relay configuration rejects public/all-interface binds and invalid ports', () => {
    for (const ip of ['127.0.0.1', '0.0.0.0', '8.8.8.8', '172.32.0.1', 'hostname', '::1']) assert.equal(privateIPv4(ip), false);
    for (const ip of ['10.0.0.1', '172.31.112.1', '192.168.1.1']) assert.equal(privateIPv4(ip), true);
    for (const value of [0, 65536, '10809/path', '-1', '']) assert.throws(() => port(value));
});
test('only the explicit peer and credential-free GitHub HTTPS CONNECT are accepted', async t => {
    const relay = createRelay({peer: '127.0.0.1', upstreamPort: 1});
    const localPort = await listen(relay.server); t.after(() => relay.close());
    for (const line of ['GET http://github.com/ HTTP/1.1\r\n', 'CONNECT example.com:443 HTTP/1.1\r\n',
        'CONNECT github.com:80 HTTP/1.1\r\n', 'CONNECT github.com:443 HTTP/1.1\r\nProxy-Authorization: secret\r\n']) {
        assert.match(await request(localPort, line + 'Host: github.com:443\r\n\r\n'), /403 Forbidden/);
    }
    const other = createRelay({peer: '127.0.0.2', upstreamPort: 1});
    const otherPort = await listen(other.server); t.after(() => other.close());
    assert.equal(await request(otherPort, 'CONNECT github.com:443 HTTP/1.1\r\n\r\n', true), '');
});
test('relay forwards only a fixed CONNECT and tunnels bytes without forwarding proxy headers', async t => {
    const connections = new Set(); let first = true, observed;
    const upstream = net.createServer(socket => {
        connections.add(socket); socket.on('close', () => connections.delete(socket));
        socket.on('data', chunk => {
            if (first) {first = false; observed = chunk.toString(); socket.write('HTTP/1.1 200 OK\r\nX-Private: hidden\r\n\r\n');}
            else socket.write(chunk);
        });
    });
    const upstreamPort = await listen(upstream);
    t.after(() => {for (const socket of connections) socket.destroy(); return new Promise(resolve => upstream.close(resolve));});
    const relay = createRelay({peer: '127.0.0.1', upstreamPort});
    const localPort = await listen(relay.server); t.after(() => relay.close());
    await new Promise((resolve, reject) => {
        const socket = net.connect({host: '127.0.0.1', port: localPort}, () => socket.write('CONNECT github.com:443 HTTP/1.1\r\nHost: github.com:443\r\n\r\n'));
        let connected = false;
        socket.setTimeout(2000, () => {socket.destroy(); reject(new Error('Test timeout'));}); socket.on('error', reject);
        socket.on('data', chunk => {
            if (!connected) {assert.equal(chunk.toString(), 'HTTP/1.1 200 Connection Established\r\n\r\n'); connected = true; socket.write('encrypted-test-bytes');}
            else {assert.equal(chunk.toString(), 'encrypted-test-bytes'); socket.destroy(); resolve();}
        });
    });
    assert.equal(observed, 'CONNECT github.com:443 HTTP/1.1\r\nHost: github.com:443\r\n\r\n');
});
