'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');

const redirects = require(process.env.FOLLOW_REDIRECTS_MODULE || 'follow-redirects');
const repoRoot = process.env.STORYCORE_REPO_ROOT || path.resolve(__dirname, '../..');
const projectPaths = ['.', 'config', 'creative-studio-ui'];
const credentials = {
  Authorization: 'Bearer regression-test-placeholder',
  'Proxy-Authorization': 'Basic regression-test-placeholder',
  Cookie: 'session=regression-test-placeholder',
  'X-Api^Key': 'caret-placeholder',
  'X-Token|Secret': 'pipe-placeholder',
  'X-Control-Key': 'custom-placeholder',
  'X-Token': 'unrelated-token-placeholder',
  Secret: 'unrelated-secret-placeholder',
  'X-Ordinary': 'keep-this-header',
};
const customSensitive = ['X-Api^Key', 'X-Token|Secret', 'X-Control-Key'];
let source;
let destination;
let sourceUrl;
let destinationUrl;

function inspect(request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(request.headers));
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve('http://127.0.0.1:' + server.address().port);
    });
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
}

before(async () => {
  destination = http.createServer(inspect);
  destinationUrl = await listen(destination);
  source = http.createServer((request, response) => {
    if (request.url === '/cross' || request.url === '/same') {
      response.writeHead(302, {
        Location: (request.url === '/cross' ? destinationUrl : sourceUrl) + '/inspect',
      });
      response.end();
    } else {
      inspect(request, response);
    }
  });
  sourceUrl = await listen(source);
});

after(async () => {
  await Promise.all([close(source), close(destination)]);
});

function requestHeaders(route, headers, sensitiveHeaders = []) {
  return new Promise((resolve, reject) => {
    const request = redirects.http.get(sourceUrl + route, {
      headers,
      sensitiveHeaders,
      agent: false,
      maxRedirects: 3,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try {
          assert.equal(response.statusCode, 200);
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.setTimeout(3000, () => request.destroy(new Error('Loopback request timed out')));
  });
}

for (const project of projectPaths) {
  test('lockfile safety: ' + project, () => {
    const lock = JSON.parse(fs.readFileSync(path.join(repoRoot, project, 'package-lock.json'), 'utf8'));
    const copies = Object.entries(lock.packages).filter(([name]) =>
      /(^|\/)node_modules\/follow-redirects$/.test(name));
    assert.ok(copies.length > 0, 'the affected package must be checked, not skipped');
    for (const [name, metadata] of copies) {
      assert.match(metadata.version, /^\d+\.\d+\.\d+$/);
      const [major, minor, patch] = metadata.version.split('.').map(Number);
      assert.ok(major > 1 || (major === 1 && (minor > 16 || (minor === 16 && patch >= 1))),
        project + '/' + name + ' must resolve to follow-redirects >=1.16.1');
    }
  });
}

for (const form of ['object', 'array']) {
  const makeHeaders = () => form === 'array'
    ? ['Host', new URL(sourceUrl).host, ...Object.entries(credentials).flat()]
    : { ...credentials };

  test('cross-origin ' + form + ' headers strip built-in credentials', { timeout: 5000 }, async () => {
    const received = await requestHeaders('/cross', makeHeaders());
    for (const name of ['authorization', 'proxy-authorization', 'cookie']) {
      assert.equal(received[name], undefined, name + ' must not reach the other origin');
    }
    assert.equal(received['x-ordinary'], credentials['X-Ordinary']);
  });

  test('cross-origin ' + form + ' headers strip custom credentials with regex characters',
    { timeout: 5000 }, async () => {
      const received = await requestHeaders('/cross', makeHeaders(), customSensitive);
      for (const name of ['Authorization', 'Proxy-Authorization', 'Cookie', ...customSensitive]) {
        assert.equal(received[name.toLowerCase()], undefined, name + ' must be stripped');
      }
      assert.equal(received['x-token'], credentials['X-Token']);
      assert.equal(received.secret, credentials.Secret);
      assert.equal(received['x-ordinary'], credentials['X-Ordinary']);
    });

  test('same-origin ' + form + ' redirect preserves legitimate credentials', { timeout: 5000 }, async () => {
    const received = await requestHeaders('/same', makeHeaders(), customSensitive);
    for (const [name, value] of Object.entries(credentials)) {
      assert.equal(received[name.toLowerCase()], value);
    }
  });

  test('ordinary ' + form + ' HTTP request preserves legitimate headers', { timeout: 5000 }, async () => {
    const received = await requestHeaders('/inspect', makeHeaders(), customSensitive);
    for (const [name, value] of Object.entries(credentials)) {
      assert.equal(received[name.toLowerCase()], value);
    }
  });
}
