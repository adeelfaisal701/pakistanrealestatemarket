const path = require('node:path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

class SafeProvisionError extends Error {}

async function provisionAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const mongoUri = process.env.MONGODB_URI;

  if (!email || !password) {
    throw new SafeProvisionError(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before provisioning.',
    );
  }
  if (!mongoUri) {
    throw new SafeProvisionError(
      'Set MONGODB_URI in backend/.env before provisioning.',
    );
  }

  await mongoose.connect(mongoUri);
  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email }, { projection: { role: 1 } });
  if (existing) {
    if (existing.role !== 'admin') {
      throw new SafeProvisionError(
        'An account already uses ADMIN_EMAIL but is not an admin. No account was changed.',
      );
    }
    console.log('Configured admin account is already provisioned; no changes made.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await users.insertOne({
    name: 'Platform Administrator',
    email,
    passwordHash,
    role: 'admin',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Configured admin account was provisioned with a bcrypt password hash.');
}

provisionAdmin()
  .catch((error) => {
    const message =
      error instanceof SafeProvisionError
        ? error.message
        : `${error instanceof Error ? error.name : 'Error'}; details redacted.`;
    console.error(`Admin provisioning failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
