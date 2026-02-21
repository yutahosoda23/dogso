const { Pool } = require('pg');

// PostgreSQL接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// テーブル作成
const initDB = async () => {
  try {
    // チャンネルテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 初期データ投入（浦和レッズ）
    await pool.query(`
      INSERT INTO channels (id, name, slug, description) 
      VALUES (1, '浦和レッズ', 'urawa', '浦和レッズサポーターのコミュニティ')
      ON CONFLICT (id) DO NOTHING
    `);

    // ユーザーテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // スレッドテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS threads (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        url TEXT NOT NULL,
        thumbnail TEXT,
        tags TEXT,
        channel_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES channels(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // コメントテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        thread_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES threads(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (parent_id) REFERENCES comments(id)
      )
    `);

    // リアクションテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        thread_id INTEGER,
        comment_id INTEGER,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES threads(id),
        FOREIGN KEY (comment_id) REFERENCES comments(id),
        UNIQUE(user_id, thread_id, comment_id, type)
      )
    `);

    console.log('データベーステーブルを作成しました');
  } catch (error) {
    console.error('テーブル作成エラー:', error);
  }
};

initDB();

module.exports = pool;