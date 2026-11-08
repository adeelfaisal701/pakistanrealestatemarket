import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CompleteAgentProfileDto } from '../src/modules/users/dto/complete-agent-profile.dto';
import { isAgentProfileComplete } from '../src/modules/users/agent-profile.utils';

const validationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

test('requires a non-empty avatar and agency address for completion', () => {
  assert.equal(isAgentProfileComplete({ avatarUrl: '/avatar.jpg', agencyAddress: 'Office' }), true);
  assert.equal(isAgentProfileComplete({ agencyAddress: 'Office' }), false);
  assert.equal(isAgentProfileComplete({ avatarUrl: '/avatar.jpg' }), false);
  assert.equal(isAgentProfileComplete({ avatarUrl: '  ', agencyAddress: 'Office' }), false);
  assert.equal(isAgentProfileComplete({ avatarUrl: '/avatar.jpg', agencyAddress: '   ' }), false);
});

test('validates the required agency address and rejects unrecognized profile fields', async () => {
  const transform = (payload: Record<string, unknown>) =>
    validationPipe.transform(payload, {
      type: 'body',
      metatype: CompleteAgentProfileDto,
    });

  await assert.rejects(transform({ agencyAddress: '' }), BadRequestException);
  await assert.rejects(transform({ agencyAddress: '   ' }), BadRequestException);
  await assert.rejects(
    transform({ agencyAddress: 'Office', role: 'admin' }),
    BadRequestException,
  );
  const result = await transform({ agencyAddress: 'Office, Lahore' });
  assert.ok(result instanceof CompleteAgentProfileDto);
});
