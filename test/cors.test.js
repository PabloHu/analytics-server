const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const options = require('../config/cors');
for (const origin of ['https://app.kiwichito.com', 'https://admin.kiwichito.com', 'https://kiwichito.com', 'https://untrusted.example']) {
  test(`browser preflight and authentication: ${origin}`, async () => {
    const app = express();
    app.use(cors(options));
    app.get('/rbac/me', (req, res) => res.status(401).json({ error: 'Authentication required' }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const url = `http://127.0.0.1:${server.address().port}/rbac/me`;
      const response = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin.includes('untrusted') ? null : origin);
      assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
      const unauthenticated = await fetch(url, { headers: { Origin: origin } });
      assert.equal(unauthenticated.status, 401);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
}
