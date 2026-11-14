import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../security-headers.mjs";

test("CSP contains only explicit app resource requirements", () => {
  const nonce = "YWJjZDEyMzQ1Njc4OTA=";
  const policy = buildContentSecurityPolicy({
    NODE_ENV: "production",
    CSP_IMAGE_ORIGINS: "https://images.example",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example/v1",
  }, nonce);

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, new RegExp(`script-src 'self' 'nonce-${nonce}'`));
  assert.match(policy, /script-src-attr 'none'/);
  assert.match(policy, new RegExp(`style-src 'self' 'nonce-${nonce}'`));
  assert.match(policy, /style-src-attr 'unsafe-inline'/);
  assert.match(policy, new RegExp(`style-src-elem 'self' 'nonce-${nonce}'`));
  assert.match(policy, /img-src 'self' data: blob:/);
  assert.match(policy, /https:\/\/tile\.openstreetmap\.org/);
  assert.match(policy, /https:\/\/images\.example/);
  assert.match(policy, /connect-src 'self' https:\/\/api\.example/);
  assert.match(policy, /media-src 'self' blob: https:\/\/images\.example https:\/\/api\.example/);
  assert.match(policy, /frame-src https:\/\/maps\.google\.com/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-(?:inline|eval)/);
  assert.doesNotMatch(policy, /(?:^|;)\s*style-src(?:-elem)?\s+[^;]*unsafe-inline/);
  assert.doesNotMatch(policy, /\*/);
});

test("CSP allows only verified Next.js development tooling exceptions in development", () => {
  const nonce = "ZGV2ZWxvcG1lbnQ=";
  const policy = buildContentSecurityPolicy({ NODE_ENV: "development" }, nonce);

  assert.match(policy, new RegExp(`script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`));
  assert.match(policy, /style-src-elem 'self' 'unsafe-inline'/);
  assert.match(policy, /style-src-attr 'unsafe-inline'/);
  assert.doesNotMatch(policy, /script-src-attr[^;]*unsafe/);
});

test("CSP requires a valid per-request nonce", () => {
  assert.throws(() => buildContentSecurityPolicy({ NODE_ENV: "production" }));
  assert.throws(() => buildContentSecurityPolicy({ NODE_ENV: "production" }, "invalid nonce"));
});

test("CSP origin configuration rejects wildcard, paths, and insecure production origins", () => {
  for (const origin of ["*", "https://images.example/path", "http://images.example"]) {
    assert.throws(
      () => buildContentSecurityPolicy({
        NODE_ENV: "production",
        CSP_IMAGE_ORIGINS: origin,
      }),
    );
  }
});

test("security headers contain baseline protections without a duplicate static CSP", () => {
  const headers = buildSecurityHeaders({ NODE_ENV: "production" });
  const values = Object.fromEntries(headers.map(({ key, value }) => [key, value]));
  assert.equal(values["Content-Security-Policy-Report-Only"], undefined);
  assert.equal(values["X-Content-Type-Options"], "nosniff");
  assert.equal(values["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(values["X-Frame-Options"], "DENY");
  assert.equal(
    values["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  assert.equal(values["Strict-Transport-Security"], undefined);
});

test("HSTS is emitted only for explicitly enabled HTTPS production deployments", () => {
  const enabled = buildSecurityHeaders({
    NODE_ENV: "production",
    ENABLE_HSTS: "true",
  });
  const development = buildSecurityHeaders({
    NODE_ENV: "development",
    ENABLE_HSTS: "true",
  });
  assert.equal(
    enabled.find(({ key }) => key === "Strict-Transport-Security")?.value,
    "max-age=31536000",
  );
  assert.equal(
    development.some(({ key }) => key === "Strict-Transport-Security"),
    false,
  );
});
