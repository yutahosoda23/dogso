const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dogso.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('データベースに接続しました');
  }
});

db.serialize(() => {
  // 既存テーブルを削除して再作成（本番環境のリセット）
  db.run(`DROP TABLE IF EXISTS reactions`);
  db.run(`DROP TABLE IF EXISTS comments`);
  db.run(`DROP TABLE IF EXISTS threads`);
  db.run(`DROP TABLE IF EXISTS users`);
  db.run(`DROP TABLE IF EXISTS channels`);

  // チャンネルテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 初期データ投入（浦和レッズ）
  db.run(`
    INSERT OR IGNORE INTO channels (id, name, slug, description) 
    VALUES (1, '浦和レッズ', 'urawa', '浦和レッズサポーターのコミュニティ')
  `);

  // ユーザーテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // スレッドテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      url TEXT NOT NULL,
      thumbnail TEXT,
      tags TEXT,
      channel_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // コメントテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES threads(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    )
  `);

  // リアクションテーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      thread_id INTEGER,
      comment_id INTEGER,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (thread_id) REFERENCES threads(id),
      FOREIGN KEY (comment_id) REFERENCES comments(id),
      UNIQUE(user_id, thread_id, comment_id, type)
    )
  `);

  console.log('テーブルを作成しました');
});

module.exports = db;