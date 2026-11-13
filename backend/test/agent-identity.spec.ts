import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DEFAULT_AGENT_IDENTITY,
  mapAgentIdentity,
} from '../../frontend/src/lib/agent-identity';

test('agent identity uses the authenticated profile fields', () => {
  assert.deepEqual(
    mapAgentIdentity({
      name: '  Agent A  ',
      email: 'agent-a@example.test',
      role: 'agent',
      avatarUrl: 'https://images.example.test/agent-a.png',
    }),
    {
      name: 'Agent A',
      email: 'agent-a@example.test',
      role: 'agent',
      avatarUrl: 'https://images.example.test/agent-a.png',
      agencyName: null,
      isVerified: false,
    },
  );
  assert.deepEqual(
    mapAgentIdentity({
      name: 'Agent B',
      role: 'agent',
      agencyName: '  Example Realty  ',
      isVerified: true,
    }),
    {
      name: 'Agent B',
      email: null,
      role: 'agent',
      avatarUrl: null,
      agencyName: 'Example Realty',
      isVerified: true,
    },
  );
  // Only a literal boolean true marks the agent as verified.
  assert.equal(mapAgentIdentity({ isVerified: 'true' }).isVerified, false);
});

test('missing profile data uses a neutral identity rather than a fabricated agent name', () => {
  assert.deepEqual(mapAgentIdentity({ name: '  ', email: null }), DEFAULT_AGENT_IDENTITY);
  assert.equal(mapAgentIdentity(null).name, 'Account');
  assert.notEqual(mapAgentIdentity({}).name, 'Adeel Malik');
});

test('agent avatar accepts safe URLs and ignores unsupported schemes', () => {
  assert.equal(
    mapAgentIdentity({ avatarUrl: '/uploads/agent.png' }).avatarUrl,
    '/uploads/agent.png',
  );
  assert.equal(mapAgentIdentity({ avatarUrl: 'javascript:alert(1)' }).avatarUrl, null);
});
