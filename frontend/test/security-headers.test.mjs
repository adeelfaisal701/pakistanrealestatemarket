import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../security-headers.mjs";

test("CSP contains only explicit app resource requirements", () => {
  const policy = buildContentSecurityPolicy({
    NODE_ENV: "production",
    CSP_IMAGE_ORIGINS: "https://images.example",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example/v1",
  });

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self'/);
  assert.match(policy, /style-src 'self'/);
  assert.match(policy, /img-src 'self' data: blob:/);
  assert.match(policy, /https:\/\/tile\.openstreetmap\.org/);
  assert.match(policy, /https:\/\/images\.example/);
  assert.match(policy, /connect-src 'self' https:\/\/api\.example/);
  assert.match(policy, /frame-src https:\/\/maps\.google\.com/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|\*/);
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

test("security headers include report-only CSP and baseline protections", () => {
  const headers = buildSecurityHeaders({ NODE_ENV: "production" });
  const values = Object.fromEntries(headers.map(({ key, value }) => [key, value]));
  assert.ok(values["Content-Security-Policy-Report-Only"]);
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
