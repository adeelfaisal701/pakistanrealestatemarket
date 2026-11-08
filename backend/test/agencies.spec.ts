import 'reflect-metadata';
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AgenciesService } from '../src/modules/agencies/agencies.service';
import { UpdateAgencyProfileDto } from '../src/modules/agencies/dto/update-agency-profile.dto';

function query(value: unknown) {
  return {
    select() {
      return this;
    },
    exec: async () => value,
  };
}

test('agency profile access requires an active agent account', async () => {
  const service = new AgenciesService(
    {} as never,
    { findOne: () => query(null) } as never,
    {} as never,
  );

  await assert.rejects(service.getManagedProfile('buyer-id'), ForbiddenException);
});

test('agency managers cannot remove their own agency association', async () => {
  const manager = { agencyName: 'Example Realty', agencyAddress: 'Office address', city: 'Lahore' };
  const userModel = { findOne: () => query(manager) };
  const service = new AgenciesService({} as never, userModel as never, {} as never);

  await assert.rejects(
    service.removeAgent('agent-id', 'agent-id'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'You cannot remove your own agency association.',
  );
});

test('agency profile validation accepts blank optional contacts and rejects invalid values', async () => {
  const blankContacts = plainToInstance(UpdateAgencyProfileDto, {
    name: 'Example Realty',
    email: '',
    website: '',
    galleryUrls: '[]',
  });
  assert.deepEqual(await validate(blankContacts), []);

  const invalidContacts = plainToInstance(UpdateAgencyProfileDto, {
    name: 'Example Realty',
    email: 'not-an-email',
    website: 'ftp://example.com',
  });
  assert.ok((await validate(invalidContacts)).length > 0);
});
