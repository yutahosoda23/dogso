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
        url TEXT,
        thumbnail TEXT,
        tags TEXT,
        media_url TEXT,
        media_type TEXT,
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

    // 既存テーブルに新しいカラムを追加（エラーは無視）
    try {
      await pool.query(`ALTER TABLE threads ADD COLUMN IF NOT EXISTS media_url TEXT`);
      await pool.query(`ALTER TABLE threads ADD COLUMN IF NOT EXISTS media_type TEXT`);
      console.log('メディアカラムを追加しました');
    } catch (error) {
      // カラムが既に存在する場合はエラーを無視
      console.log('メディアカラムは既に存在します');
    }

    // URLカラムのNOT NULL制約を削除
    try {
      await pool.query(`ALTER TABLE threads ALTER COLUMN url DROP NOT NULL`);
      console.log('URL制約を削除しました');
    } catch (error) {
      console.log('URL制約削除スキップ:', error.message);
    }

    console.log('データベーステーブルを作成しました');
  } catch (error) {
    console.error('テーブル作成エラー:', error);
  }
};

initDB();

module.exports = pool;