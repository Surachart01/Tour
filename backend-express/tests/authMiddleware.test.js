import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  authorize,
  authorizeSuperAdmin,
  validateJWT,
} from '../src/middleware/auth.js';

const LOCAL_TEST_SECRET = process.env.JWT_SECRET || 'local-development-jwt-secret';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

test('JWT middleware rejects a missing authorization header', () => {
  const req = { headers: {}, method: 'GET', url: '/protected' };
  const res = createResponse();
  let nextCalled = false;

  validateJWT(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body, 'Missing Authorization Header');
  assert.equal(nextCalled, false);
});

test('JWT middleware rejects malformed and invalid tokens', () => {
  for (const authorization of ['Token value', 'Bearer invalid-token']) {
    const req = {
      headers: { authorization },
      method: 'GET',
      url: '/protected',
    };
    const res = createResponse();
    let nextCalled = false;

    validateJWT(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test('JWT middleware accepts a valid token and exposes its user claims', async () => {
  const token = jwt.sign(
    { user_id: 7, username: 'agent-a', role: 'agent' },
    LOCAL_TEST_SECRET,
    { expiresIn: '5m' },
  );
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method: 'GET',
    url: '/protected',
  };
  const res = createResponse();

  await new Promise((resolve, reject) => {
    validateJWT(req, res, resolve);
    setTimeout(() => reject(new Error('JWT middleware did not finish')), 1000);
  });

  assert.equal(req.user.user_id, 7);
  assert.equal(req.user.role, 'agent');
  assert.equal(req.isSuperAdmin, false);
});

test('role authorization allows the configured role and rejects other roles', () => {
  const allowedReq = { user: { username: 'admin-a', role: 'admin' } };
  const allowedRes = createResponse();
  let allowed = false;
  authorize('admin')(allowedReq, allowedRes, () => { allowed = true; });
  assert.equal(allowed, true);

  const deniedReq = { user: { username: 'agent-a', role: 'agent' } };
  const deniedRes = createResponse();
  let deniedNext = false;
  authorize('admin')(deniedReq, deniedRes, () => { deniedNext = true; });
  assert.equal(deniedRes.statusCode, 403);
  assert.equal(deniedNext, false);
});

test('superadmin authorization is explicit', () => {
  const allowedRes = createResponse();
  let allowed = false;
  authorizeSuperAdmin({ isSuperAdmin: true }, allowedRes, () => { allowed = true; });
  assert.equal(allowed, true);

  const deniedRes = createResponse();
  authorizeSuperAdmin(
    { isSuperAdmin: false, user: { username: 'admin-a' } },
    deniedRes,
    () => assert.fail('non-superadmin must not pass'),
  );
  assert.equal(deniedRes.statusCode, 403);
});
