export default () => ({
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Pakistan Real Estate & Agent CRM API',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pak_real_estate',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_zameen_pakistan_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
});
