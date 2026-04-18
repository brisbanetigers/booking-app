import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration for public booking routes
export const customerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 30000,
});

// Configuration for secure staff administration
export const staffPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

const errHandler = (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
};

customerPool.on('error', errHandler);
staffPool.on('error', errHandler);

export const queryCustomer = (text, params) => customerPool.query(text, params);
export const queryStaff = (text, params) => staffPool.query(text, params);

export const initializeDatabase = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  try {
    await staffPool.query(schema);
    console.log('Database schema initialized.');
  } catch (err) {
    console.error('Error initializing database schema:', err);
    throw err;
  }
};
