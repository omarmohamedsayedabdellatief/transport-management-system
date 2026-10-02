import dotenv from 'dotenv';
dotenv.config();
if(process.env.NODE_ENV==='production'){
  for(const key of ['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CLIENT_ORIGIN']) {
    if(!process.env[key] || (key.includes('SECRET') && process.env[key]!.length<32)) throw new Error(`Production configuration requires ${key}.`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'tms_access_default_secret_key_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'tms_refresh_default_secret_key_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};