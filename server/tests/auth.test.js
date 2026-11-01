process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-v2";
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const {
  makeProtect,
  allow
} = require("../middleware/authMiddleware");
const {
  config
} = require("../config");
const {
  createApp
} = require("../app");
const v = require("../lib/validation");
function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}
function token(version = 2) {
  return jwt.sign({
    version
  }, config.jwtSecret, {
    subject: "012345678901234567890123",
    issuer: "get-outreach-v2",
    expiresIn: "1h"
  });
}
test("disabled, missing, legacy, and revoked users cannot use an existing token", async () => {
  for (const user of [null, {
    active: false,
    seat: 1,
    role: "admin",
    tokenVersion: 2
  }, {
    active: true,
    role: "admin",
    tokenVersion: 2
  }, {
    active: true,
    seat: 1,
    role: "admin",
    tokenVersion: 3
  }]) {
    const res = response();
    await makeProtect({
      findById: async () => user
    })({
      headers: {
        authorization: "Bearer " + token()
      }
    }, res, () => assert.fail("Access should be denied"));
    assert.equal(res.statusCode, 401);
  }
});
test("permissions use the current database role instead of token claims", async () => {
  const req = {
    headers: {
      authorization: "Bearer " + token()
    }
  };
  const res = response();
  await makeProtect({
    findById: async () => ({
      active: true,
      seat: 1,
      role: "viewer",
      tokenVersion: 2
    })
  })(req, res, () => {});
  allow("admin", "operator")(req, res, () => assert.fail("Viewer cannot write"));
  assert.equal(res.statusCode, 403);
});
test("valid active users authenticate; malformed tokens fail", async () => {
  let called = false;
  const guard = makeProtect({
    findById: async () => ({
      active: true,
      seat: 1,
      role: "operator",
      tokenVersion: 2
    })
  });
  await guard({
    headers: {
      authorization: "Bearer " + token()
    }
  }, response(), () => {
    called = true;
  });
  assert.equal(called, true);
  const res = response();
  await guard({
    headers: {
      authorization: "Bearer invalid"
    }
  }, res, () => assert.fail());
  assert.equal(res.statusCode, 401);
});
test("public signup, old send endpoints, and token-disclosing OAuth routes are closed", async t => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  for (const [route, status] of [["/api/auth/register", 403], ["/api/email/test", 410], ["/api/automation/send-all", 410], ["/auth/gmail/callback?code=secret", 410]]) {
    const res = await fetch(base + route, {
      method: route.includes("callback") ? "GET" : "POST"
    });
    assert.equal(res.status, status);
    assert.equal((await res.text()).includes("REFRESH TOKEN"), false);
  }
});
test("validation rejects query objects and normalizes email addresses", () => {
  assert.throws(() => v.text({
    $ne: ""
  }, "Username"));
  assert.throws(() => v.email("x\n@y.com"));
  assert.equal(v.email(" Person@Example.com "), "person@example.com");
  assert.throws(() => v.password("short"));
});
