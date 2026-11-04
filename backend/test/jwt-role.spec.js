const assert = require("node:assert/strict");
const test = require("node:test");
const { JwtStrategy } = require("../src/modules/auth/strategies/jwt.strategy");

function createStrategy(user) {
  const configService = { getOrThrow: () => "test-only-secret" };
  const usersService = { findById: async () => user };
  return new JwtStrategy(configService, usersService);
}

test("JWT authorization role is read from the current database user", async () => {
  const strategy = createStrategy({
    email: "agent@example.test",
    role: "agent",
  });

  const identity = await strategy.validate({
    sub: "test-user-id",
    email: "stale@example.test",
    role: "buyer",
  });

  assert.equal(identity.role, "agent");
  assert.equal(identity.email, "agent@example.test");
});

test("JWT validation rejects a token for a user that no longer exists", async () => {
  const strategy = createStrategy(null);

  await assert.rejects(
    strategy.validate({
      sub: "deleted-user-id",
      email: "user@example.test",
      role: "agent",
    }),
    { status: 401 },
  );
});
