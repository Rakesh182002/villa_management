const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Database Initialization Script
 * Executes the schema.sql file against the configured database.
 */
async function initializeDatabase() {
  console.log('🚀 Starting Database Initialization...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      multipleStatements: true, 
    });

    console.log('✅ Connected to database for initialization.');

    const schemaPath = path.join(__dirname, '../../../database/1.0.0/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📜 Parsing and executing schema statements...');

    // Split statements by semicolon, but be mindful of comments and empty lines
    const statements = schema
      .replace(/\r/g, '') // Normalize line endings
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        console.warn(`⚠️ Warning: Statement failed: ${statement.substring(0, 50)}...`);
        console.warn(`Error: ${err.message}`);
        // We continue for DROP TABLE IF EXISTS errors, but might want to stop for others
        if (!err.message.includes('exists') && !err.message.includes('Unknown table')) {
          throw err;
        }
      }
    }
    
    console.log('✨ Schema execution complete! Database is ready.');
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    if (connection) await connection.end();
    throw error;
  }
}

// Export the function for use in server.js
module.exports = initializeDatabase;

// If run directly via node src/scripts/init-db.js, invoke it
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
