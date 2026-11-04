import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  clearAgentDashboardData,
  getAgentAccountId,
  LEGACY_AGENT_DASHBOARD_STORAGE_KEY,
  synchronizeAgentDashboardAccount,
} from '../../frontend/src/lib/agent-session-data';

function makeStorage() {
  const removed: string[] = [];
  return {
    removed,
    removeItem: (key: string) => removed.push(key),
  };
}

test('sign-out cleanup removes legacy agent data and resets in-memory data', () => {
  const storage = makeStorage();
  let resetCount = 0;

  clearAgentDashboardData(storage, () => {
    resetCount += 1;
  });

  assert.deepEqual(storage.removed, [LEGACY_AGENT_DASHBOARD_STORAGE_KEY]);
  assert.equal(resetCount, 1);
});

test('account changes clear data while the same account preserves current state', () => {
  const storage = makeStorage();
  let currentData = ['agent-a-private-lead'];
  const reset = () => {
    currentData = [];
  };

  const sameAccount = synchronizeAgentDashboardAccount(
    storage,
    'agent-a',
    'agent-a',
    reset,
  );
  assert.equal(sameAccount, 'agent-a');
  assert.deepEqual(currentData, ['agent-a-private-lead']);

  const switchedAccount = synchronizeAgentDashboardAccount(
    storage,
    sameAccount,
    'agent-b',
    reset,
  );
  assert.equal(switchedAccount, 'agent-b');
  assert.deepEqual(currentData, []);
  assert.deepEqual(storage.removed, [
    LEGACY_AGENT_DASHBOARD_STORAGE_KEY,
    LEGACY_AGENT_DASHBOARD_STORAGE_KEY,
  ]);
});

test('account identity is read from the authenticated user record only', () => {
  assert.equal(getAgentAccountId('{"id":"agent-123","role":"agent"}'), 'agent-123');
  assert.equal(getAgentAccountId('{"role":"agent"}'), null);
  assert.equal(getAgentAccountId('not-json'), null);
  assert.equal(getAgentAccountId(null), null);
});
