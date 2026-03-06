const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(50) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) REFERENCES users(username),
        message TEXT,
        is_from_user BOOLEAN,
        timestamp TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) REFERENCES users(username),
        type VARCHAR(20),
        details JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        timestamp TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS wallet_connects (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) REFERENCES users(username),
        wallet_address VARCHAR(100),
        timestamp TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) REFERENCES users(username),
        message TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables ready');
  } catch (err) {
    console.error('DB init error:', err);
  }
};
initDB();

module.exports = pool;
