const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cheerio = require('cheerio');
const axios = require('axios');
const pool = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ミドルウェア
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://dogso.vercel.app',
  credentials: true
}));
app.use(express.json());

// JWT認証ミドルウェア
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

// サムネイル取得関数
const getThumbnail = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(response.data);
    
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return ogImage;
    
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (twitterImage) return twitterImage;
    
    return null;
  } catch (error) {
    console.error('サムネイル取得エラー:', error.message);
    return null;
  }
};

// ================== チャンネル関連 ==================

// チャンネル一覧取得
app.get('/api/channels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM channels ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('チャンネル取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 特定チャンネルの取得
app.get('/api/channels/:slug', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM channels WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'チャンネルが見つかりません' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('チャンネル取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ================== ユーザー関連 ==================

// ユーザー登録
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '必要な情報が不足しています' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint error
      return res.status(400).json({ error: 'ユーザー名またはメールアドレスが既に使用されています' });
    }
    console.error('登録エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ログイン
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ================== スレッド関連 ==================

// スレッド一覧取得（チャンネルでフィルタリング可能）
app.get('/api/threads', async (req, res) => {
  const { channel } = req.query;
  
  try {
    let query = `
      SELECT threads.*, users.username, channels.name as channel_name, channels.slug as channel_slug,
      (SELECT COUNT(*) FROM comments WHERE comments.thread_id = threads.id) as comment_count
      FROM threads 
      JOIN users ON threads.user_id = users.id 
      LEFT JOIN channels ON threads.channel_id = channels.id
    `;
    
    const params = [];
    
    if (channel) {
      query += ' WHERE channels.slug = $1';
      params.push(channel);
    }
    
    query += ' ORDER BY threads.created_at DESC';
    
    const threadsResult = await pool.query(query, params);
    
    // 各スレッドのリアクション情報を取得
    const threadsWithReactions = await Promise.all(
      threadsResult.rows.map(async (thread) => {
        const reactionsResult = await pool.query(
          'SELECT type, COUNT(*) as count FROM reactions WHERE thread_id = $1 GROUP BY type',
          [thread.id]
        );
        return { ...thread, reactions: reactionsResult.rows };
      })
    );
    
    res.json(threadsWithReactions);
  } catch (error) {
    console.error('スレッド一覧取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// スレッド詳細取得
app.get('/api/threads/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const threadResult = await pool.query(
      `SELECT threads.*, users.username, channels.name as channel_name, channels.slug as channel_slug 
       FROM threads 
       JOIN users ON threads.user_id = users.id 
       LEFT JOIN channels ON threads.channel_id = channels.id 
       WHERE threads.id = $1`,
      [id]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'スレッドが見つかりません' });
    }

    const thread = threadResult.rows[0];

    // スレッドのリアクション情報を取得
    const reactionsResult = await pool.query(
      'SELECT type, COUNT(*) as count FROM reactions WHERE thread_id = $1 GROUP BY type',
      [id]
    );
    thread.reactions = reactionsResult.rows;

    // コメントも取得
    const commentsResult = await pool.query(
      `SELECT comments.*, users.username,
       (SELECT COUNT(*) FROM comments as replies WHERE replies.parent_id = comments.id) as reply_count
       FROM comments 
       LEFT JOIN users ON comments.user_id = users.id 
       WHERE comments.thread_id = $1 
       ORDER BY comments.created_at ASC`,
      [id]
    );

    thread.comments = commentsResult.rows;
    res.json(thread);
  } catch (error) {
    console.error('スレッド詳細取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// スレッド作成（ログイン必須）
app.post('/api/threads', authenticateToken, async (req, res) => {
  const { title, subtitle, url, tags } = req.body;
  const userId = req.user.id;

  if (!title || !url) {
    return res.status(400).json({ error: 'タイトルとURLが必要です' });
  }

  try {
    const thumbnail = await getThumbnail(url);
    const channelId = 1; // デフォルトで浦和レッズ
    
    const result = await pool.query(
      'INSERT INTO threads (title, subtitle, url, thumbnail, tags, channel_id, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, subtitle || null, url, thumbnail, tags || null, channelId, userId]
    );

    res.json({ message: 'スレッドを作成しました', thread: result.rows[0] });
  } catch (error) {
    console.error('スレッド作成エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// スレッド編集（投稿者のみ）
app.put('/api/threads/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, url, tags } = req.body;
  const userId = req.user.id;

  try {
    const threadResult = await pool.query('SELECT * FROM threads WHERE id = $1', [id]);
    
    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'スレッドが見つかりません' });
    }

    const thread = threadResult.rows[0];

    if (thread.user_id !== userId) {
      return res.status(403).json({ error: '編集する権限がありません' });
    }

    const thumbnail = await getThumbnail(url);

    await pool.query(
      'UPDATE threads SET title = $1, subtitle = $2, url = $3, thumbnail = $4, tags = $5 WHERE id = $6',
      [title, subtitle || null, url, thumbnail, tags || null, id]
    );

    res.json({ message: 'スレッドを更新しました' });
  } catch (error) {
    console.error('スレッド編集エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ================== コメント関連 ==================

// コメント投稿（ログイン必須）
app.post('/api/comments', authenticateToken, async (req, res) => {
  const { content, thread_id, parent_id } = req.body;
  const userId = req.user.id;

  if (!content || !thread_id) {
    return res.status(400).json({ error: '必要な情報が不足しています' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO comments (content, thread_id, user_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [content, thread_id, userId, parent_id || null]
    );

    res.json({ message: 'コメントを投稿しました', comment: result.rows[0] });
  } catch (error) {
    console.error('コメント投稿エラー:', error);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ================== リアクション関連 ==================

// リアクション追加（スレッドは未ログインOK、コメントはログイン必須）
app.post('/api/reactions', async (req, res) => {
  const { thread_id, comment_id, type } = req.body;
  
  if (comment_id) {
    // コメントへのリアクションはログイン必須
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'トークンがありません' });
    }
    
    try {
      const user = jwt.verify(token, JWT_SECRET);
      const userId = user.id;
      
      await pool.query(
        'INSERT INTO reactions (user_id, thread_id, comment_id, type) VALUES ($1, $2, $3, $4)',
        [userId.toString(), thread_id || null, comment_id, type]
      );
      
      res.json({ message: 'リアクションを追加しました' });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: '既にリアクション済みです' });
      }
      res.status(500).json({ error: 'サーバーエラー' });
    }
  } else {
    // スレッドへのいいね（未ログインOK）- IPアドレスで識別
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
      await pool.query(
        'INSERT INTO reactions (user_id, thread_id, comment_id, type) VALUES ($1, $2, $3, $4)',
        [ipAddress, thread_id, null, type]
      );
      
      res.json({ message: 'リアクションを追加しました' });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: '既にリアクション済みです' });
      }
      console.error('リアクション追加エラー:', error);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// リアクション削除
app.delete('/api/reactions', async (req, res) => {
  const { thread_id, comment_id, type } = req.body;
  
  if (comment_id) {
    // コメントへのリアクション削除はログイン必須
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'トークンがありません' });
    }
    
    try {
      const user = jwt.verify(token, JWT_SECRET);
      const userId = user.id;
      
      await pool.query(
        'DELETE FROM reactions WHERE user_id = $1 AND thread_id IS NULL AND comment_id = $2 AND type = $3',
        [userId.toString(), comment_id, type]
      );
      
      res.json({ message: 'リアクションを削除しました' });
    } catch (error) {
      console.error('リアクション削除エラー:', error);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  } else {
    // スレッドのいいね削除（未ログインOK）
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
      await pool.query(
        'DELETE FROM reactions WHERE user_id = $1 AND thread_id = $2 AND comment_id IS NULL AND type = $3',
        [ipAddress, thread_id, type]
      );
      
      res.json({ message: 'リアクションを削除しました' });
    } catch (error) {
      console.error('リアクション削除エラー:', error);
      res.status(500).json({ error: 'サーバーエラー' });
    }
  }
});

// ヘルスチェック用（追加）
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'DOGSO API is running' });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバーが http://0.0.0.0:${PORT} で起動しました`);
});