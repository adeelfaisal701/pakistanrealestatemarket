import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const nodeEnv = configService.get<string>('nodeEnv');
  if (!nodeEnv || !VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      'NODE_ENV must be explicitly set to development, test, or production.',
    );
  }

  return {
    uri: configService.get<string>('database.uri'),
    autoIndex: nodeEnv !== 'production',
  };
};
