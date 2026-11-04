import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mapAgentLead } from '../../frontend/src/lib/agent-lead-data';

test('agent dashboard maps authorized API leads without demo fallback values', () => {
  const mapped = mapAgentLead({
    _id: 'lead-real-123',
    clientName: 'Real Client',
    clientPhone: '+923001234567',
    propertyTitle: 'DHA Lahore apartment',
    status: 'negotiation',
    source: 'website_chat',
    budget: 25_000_000,
    interestedCity: 'Lahore',
    createdAt: '2026-10-12T08:30:00.000Z',
    notes: 'Requested a viewing',
    conversationId: 'conversation-real-456',
    advertisementId: 'advertisement-real-789',
  });

  assert.equal(mapped.id, 'lead-real-123');
  assert.equal(mapped.clientName, 'Real Client');
  assert.equal(mapped.clientPhone, '+923001234567');
  assert.equal(mapped.status, 'Negotiation');
  assert.equal(mapped.source, 'website_chat');
  assert.equal(mapped.budgetMin, '25000000');
  assert.deepEqual(mapped.preferredSocieties, ['Lahore']);
  assert.equal(mapped.interest, 'DHA Lahore apartment');
  assert.equal(mapped.conversationId, 'conversation-real-456');
  assert.equal(mapped.adId, 'advertisement-real-789');
  assert.equal(
    mapAgentLead({
      _id: 'lead-lost-123',
      clientName: 'Closed Client',
      clientPhone: '',
      status: 'lost',
      createdAt: '2026-10-12T08:30:00.000Z',
    }).status,
    'Lost',
  );
  assert.equal(
    mapAgentLead({
      _id: 'lead-won-123',
      clientName: 'Won Client',
      clientPhone: '',
      status: 'closed_won',
      createdAt: '2026-10-12T08:30:00.000Z',
    }).status,
    'Closed Won',
  );
});
