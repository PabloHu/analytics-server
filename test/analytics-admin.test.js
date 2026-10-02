const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const access = require('../middleware/analyticsAdmin');
const firebase = require('firebase-admin');

test('dashboard authorization enforces Firebase, role, expiry and permissions', async () => {
  const auth = firebase.auth();
  const original = auth.verifyIdToken;
  const originalMaster = process.env.MASTER_API_KEY;
  process.env.MASTER_API_KEY = 'test-server-master';
  auth.verifyIdToken = async token => {
    if (token === 'invalid') throw new Error('Invalid fixture token');
    return { uid: token };
  };
  const users = {
    admin: { role: 'admin', status: 'granted', permissions: ['users:read'] },
    owner: { role: 'owner', status: 'granted', permissions: ['*:*'] },
    viewer: { role: 'viewer', status: 'granted', permissions: ['users:read'] },
    expired: { role: 'admin', status: 'granted', permissions: ['users:read'], expiresAt: new Date(0) },
    missingPermission: { role: 'admin', status: 'granted', permissions: [] }
  };
  const client = { db: () => ({ collection: () => ({ findOne: async query => users[query.uid] || null }) }) };
  const app = express();
  app.use('/admin', access(async () => client));
  app.use('/admin', (req, res) => res.json({ authorized: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const [token, status] of [[null,401],['invalid',401],['admin',200],['owner',200],['viewer',403],['expired',403],['missingPermission',403],['unknown',403]]) {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/admin/stats/by-country`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      assert.equal(r.status, status, token || 'missing token');
    }
    for (const method of ['GET','POST','PATCH']) {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/admin/keys`, { method, headers: { Authorization: 'Bearer owner' } });
      assert.equal(r.status, 403, 'Firebase dashboard access must not grant key administration');
    }
    const r = await fetch(`http://127.0.0.1:${server.address().port}/admin/keys`, { headers: { 'X-Master-Key': 'test-server-master' } });
    assert.equal(r.status, 200);
  } finally {
    auth.verifyIdToken = original;
    if (originalMaster === undefined) delete process.env.MASTER_API_KEY; else process.env.MASTER_API_KEY = originalMaster;
    await new Promise(resolve => server.close(resolve));
  }
});
