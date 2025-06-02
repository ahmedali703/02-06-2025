// scripts/setup-database.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDatabase() {
  // Check if DATABASE_URL environment variable exists
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Please set the DATABASE_URL in your .env file.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful.');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL script to create tables...');
    
    // Execute the SQL script
    await pool.query(sqlScript);
    
    console.log('Database tables created successfully.');
    
    // Verify that tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

setupDatabase().catch(console.error);
