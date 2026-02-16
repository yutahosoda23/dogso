const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// ミドルウェア
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// 認証ミドルウェア（ログインが必要な機能で使う）
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'トークンがありません' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
};

// ================== ユーザー関連 ==================

// ユーザー登録
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '全ての項目を入力してください' });
  }

  try {
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'ユーザー名またはメールアドレスが既に使用されています' });
          }
          return res.status(500).json({ error: 'サーバーエラー' });
        }

        // JWT トークンを生成
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
        res.json({ 
          message: '登録成功',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ログイン
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'サーバーエラー' });
    }

    if (!user) {
      return res.status(400).json({ error: 'メールアドレスまたはパスワードが間違っています' });
    }

    // パスワードを確認
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'メールアドレスまたはパスワードが間違っています' });
    }

    // JWT トークンを生成
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({
      message: 'ログイン成功',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

// ================== スレッド関連 ==================

// スレッド一覧取得（誰でも見られる）
app.get('/api/threads', (req, res) => {
  db.all(
    `SELECT threads.*, users.username, 
     (SELECT COUNT(*) FROM comments WHERE comments.thread_id = threads.id) as comment_count,
     (SELECT COUNT(*) FROM reactions WHERE reactions.thread_id = threads.id) as reaction_count
     FROM threads 
     JOIN users ON threads.user_id = users.id 
     ORDER BY threads.created_at DESC`,
    [],
    (err, threads) => {
      if (err) {
        return res.status(500).json({ error: 'サーバーエラー' });
      }
      res.json(threads);
    }
  );
});

// スレッド詳細取得（誰でも見られる）
app.get('/api/threads/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT threads.*, users.username FROM threads JOIN users ON threads.user_id = users.id WHERE threads.id = ?',
    [id],
    (err, thread) => {
      if (err) {
        return res.status(500).json({ error: 'サーバーエラー' });
      }

      if (!thread) {
        return res.status(404).json({ error: 'スレッドが見つかりません' });
      }

      // コメントも取得
      db.all(
        `SELECT comments.*, users.username,
         (SELECT COUNT(*) FROM reactions WHERE reactions.comment_id = comments.id) as reaction_count
         FROM comments 
         JOIN users ON comments.user_id = users.id 
         WHERE comments.thread_id = ? 
         ORDER BY comments.created_at ASC`,
        [id],
        (err, comments) => {
          if (err) {
            return res.status(500).json({ error: 'サーバーエラー' });
          }

          res.json({ ...thread, comments });
        }
      );
    }
  );
});
// URLからサムネイルを取得する関数
async function getThumbnail(url) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // OGタグからサムネイルを取得
    let thumbnail = $('meta[property="og:image"]').attr('content');
    
    // OGタグがない場合、他のタグを試す
    if (!thumbnail) {
      thumbnail = $('meta[name="twitter:image"]').attr('content');
    }
    if (!thumbnail) {
      thumbnail = $('link[rel="image_src"]').attr('href');
    }
    
    return thumbnail || null;
  } catch (error) {
    console.error('サムネイル取得エラー:', error.message);
    return null;
  }
}

// スレッド作成（ログイン必須）
app.post('/api/threads', authenticateToken, async (req, res) => {
  const { title, subtitle, url, tags } = req.body;
  const userId = req.user.id;

  if (!title || !url) {
    return res.status(400).json({ error: 'タイトルとURLを入力してください' });
  }

  // サブタイトルの文字数チェック
  if (subtitle && subtitle.length > 100) {
    return res.status(400).json({ error: 'サブタイトルは100文字以内にしてください' });
  }

  // URLからサムネイルを取得
  const thumbnail = await getThumbnail(url);

  db.run(
    'INSERT INTO threads (title, subtitle, url, thumbnail, tags, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [title, subtitle || null, url, thumbnail, tags || null, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'サーバーエラー' });
      }
      
      res.json({
        message: 'スレッドを作成しました',
        thread: { id: this.lastID, title, subtitle, url, thumbnail, tags, user_id: userId }
      });
    }
  );
});

// スレッド編集（ログイン必須、投稿者のみ）
app.put('/api/threads/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, url, tags } = req.body;
  const userId = req.user.id;

  if (!title || !url) {
    return res.status(400).json({ error: 'タイトルとURLを入力してください' });
  }

  // サブタイトルの文字数チェック
  if (subtitle && subtitle.length > 100) {
    return res.status(400).json({ error: 'サブタイトルは100文字以内にしてください' });
  }

  // 投稿者確認
  db.get('SELECT * FROM threads WHERE id = ?', [id], async (err, thread) => {
    if (err) {
      return res.status(500).json({ error: 'サーバーエラー' });
    }

    if (!thread) {
      return res.status(404).json({ error: 'スレッドが見つかりません' });
    }

    if (thread.user_id !== userId) {
      return res.status(403).json({ error: '編集権限がありません' });
    }

    // URLが変更された場合は新しいサムネイルを取得
    let thumbnail = thread.thumbnail;
    if (url !== thread.url) {
      thumbnail = await getThumbnail(url);
    }

// 更新実行
    db.run(
      'UPDATE threads SET title = ?, subtitle = ?, url = ?, thumbnail = ?, tags = ? WHERE id = ?',
      [title, subtitle || null, url, thumbnail, tags || null, id],

      function(err) {
        if (err) {
          return res.status(500).json({ error: 'サーバーエラー' });
        }

        res.json({
          message: 'スレッドを更新しました',
          thread: { id, title, url, thumbnail, tags }
        });
      }
    );
  });
});
// ================== コメント関連 ==================

// コメント投稿（ログイン必須）
app.post('/api/comments', authenticateToken, (req, res) => {
  const { content, thread_id, parent_id } = req.body;
  const userId = req.user.id;

  if (!content || !thread_id) {
    return res.status(400).json({ error: 'コメント内容とスレッドIDが必要です' });
  }

  db.run(
    'INSERT INTO comments (content, thread_id, user_id, parent_id) VALUES (?, ?, ?, ?)',
    [content, thread_id, userId, parent_id || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'サーバーエラー' });
      }

      res.json({
        message: 'コメントを投稿しました',
        comment: { id: this.lastID, content, thread_id, user_id: userId }
      });
    }
  );
});

// ================== リアクション関連 ==================

// リアクション追加（ログイン必須）
app.post('/api/reactions', authenticateToken, (req, res) => {
  const { thread_id, comment_id, type } = req.body;
  const userId = req.user.id;

  if ((!thread_id && !comment_id) || !type) {
    return res.status(400).json({ error: '必要な情報が不足しています' });
  }

  db.run(
    'INSERT INTO reactions (user_id, thread_id, comment_id, type) VALUES (?, ?, ?, ?)',
    [userId, thread_id || null, comment_id || null, type],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: '既にリアクション済みです' });
        }
        return res.status(500).json({ error: 'サーバーエラー' });
      }

      res.json({ message: 'リアクションを追加しました' });
    }
  );
});

// リアクション削除（ログイン必須）
app.delete('/api/reactions', authenticateToken, (req, res) => {
  const { thread_id, comment_id, type } = req.body;
  const userId = req.user.id;

  db.run(
    'DELETE FROM reactions WHERE user_id = ? AND thread_id = ? AND comment_id = ? AND type = ?',
    [userId, thread_id || null, comment_id || null, type],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'サーバーエラー' });
      }

      res.json({ message: 'リアクションを削除しました' });
    }
  );
});

// ================== サーバー起動 ==================

app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});