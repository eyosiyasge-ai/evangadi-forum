import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSchema() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'evangadi_forum',
    multipleStatements: true,
  };

  if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log(`Connected to database '${connectionConfig.database}' on ${connectionConfig.host}:${connectionConfig.port}.`);

    // Check if the users table already exists
    const [existing] = await connection.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users' LIMIT 1",
      [connectionConfig.database]
    );

    if (existing.length > 0) {
      console.log(`Table 'users' already exists in database '${connectionConfig.database}'. Skipping schema import.`);
      await connection.end();
      return;
    }

    console.log('Running schema.sql to initialize database tables...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    await connection.query(schemaSql);
    console.log('schema.sql executed successfully.');

    // Count and list tables
    const [tables] = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [connectionConfig.database]
    );

    console.log(`Database initialization complete. Total tables in '${connectionConfig.database}': ${tables.length}`);
    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.TABLE_NAME || t.table_name}`));

    await connection.end();
  } catch (error) {
    console.error('Schema import failed:', error.message);
    if (connection) {
      try { await connection.end(); } catch (_) {}
    }
    process.exit(1);
  }
}

importSchema();
