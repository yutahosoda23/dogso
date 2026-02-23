import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

// コメントコンポーネント
function Comment({ comment, allComments, user, onReaction, threadId, channel }) {
  // このコメントへの返信数を取得
  const replies = allComments.filter(c => c.parent_id === comment.id);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP', { 
      timeZone: 'Asia/Tokyo',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="comment-item">
      <Link 
        to={`/${channel}/thread/${threadId}/comment/${comment.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="comment-card">
          <div className="comment-header">
            <strong>{comment.username}</strong>
            <span>· {formatDate(comment.created_at)}</span>
          </div>
          
          <p className="comment-content">{comment.content}</p>
          
          {replies.length > 0 && (
            <div style={{ 
              fontSize: '13px', 
              color: 'var(--reds-primary)', 
              marginTop: '8px',
              fontWeight: '500'
            }}>
              {replies.length}件の返信
            </div>
          )}
        </div>
      </Link>
      
      {user && (
        <div className="comment-actions">
          <button 
            onClick={(e) => {
              e.preventDefault();
              onReaction(comment.id, 'like');
            }}
            className="comment-action-button"
          >
            <span>👍</span>
            {comment.like_count > 0 && <span className="reply-count">{comment.like_count}</span>}
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              onReaction(comment.id, 'heart');
            }}
            className="comment-action-button"
          >
            <span>❤️</span>
            {comment.heart_count > 0 && <span className="reply-count">{comment.heart_count}</span>}
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              onReaction(comment.id, 'yellow');
            }}
            className="comment-action-button"
          >
            <span>🟨</span>
            {comment.yellow_count > 0 && <span className="reply-count">{comment.yellow_count}</span>}
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              onReaction(comment.id, 'red');
            }}
            className="comment-action-button"
          >
            <span>🟥</span>
            {comment.red_count > 0 && <span className="reply-count">{comment.red_count}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function Thread() {
  const { id, channel } = useParams();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);
  const [editUploading, setEditUploading] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchThread = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/threads/${id}`);
      setThread(response.data);
      setComments(response.data.comments || []);
      setEditTitle(response.data.title);
      setEditSubtitle(response.data.subtitle || '');
      setEditUrl(response.data.url || '');
      setEditFile(null);
      setEditFilePreview(null);
      setLoading(false);
    } catch (error) {
      console.error('スレッド取得エラー:', error);
      setError('スレッドの読み込みに失敗しました');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowMenu(false);
    window.location.href = `/${channel}`;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('コメントを投稿するにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/comments`,
        {
          content: newComment,
          thread_id: id
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setNewComment('');
      fetchThread();
    } catch (error) {
      setError(error.response?.data?.error || 'コメント投稿に失敗しました');
    }
  };

  const handleReaction = async (commentId, type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('リアクションするにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          comment_id: commentId,
          type: type
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      fetchThread();
    } catch (error) {
      if (error.response?.data?.error?.includes('既に')) {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_URL}/api/reactions`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              data: {
                comment_id: commentId,
                type: type
              }
            }
          );
          fetchThread();
        } catch (err) {
          console.error('リアクション削除エラー:', err);
        }
      } else {
        setError('リアクションに失敗しました');
      }
    }
  };

  const handleThreadLike = async () => {
    // 既にリアクション中の場合は処理しない（連打防止）
    if (isReacting) {
      return;
    }

    setIsReacting(true);

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          thread_id: id,
          type: 'heart'
        }
      );
      await fetchThread();
    } catch (error) {
      if (error.response?.data?.error?.includes('既に')) {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_URL}/api/reactions`,
            {
              data: {
                thread_id: id,
                type: 'heart'
              }
            }
          );
          await fetchThread();
        } catch (err) {
          console.error('リアクション削除エラー:', err);
        }
      }
    } finally {
      setIsReacting(false);
    }
  };

const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEditUploading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('編集するにはログインが必要です');
      setEditUploading(false);
      return;
    }

    if (editSubtitle.length > 300) {
      setError('詳細は300文字以内にしてください');
      setEditUploading(false);
      return;
    }

    try {
      let mediaUrl = thread.media_url;
      let mediaType = thread.media_type;

      // 新しいファイルがある場合、先にアップロード
      if (editFile) {
        const formData = new FormData();
        formData.append('file', editFile);

        const uploadResponse = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/upload`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        mediaUrl = uploadResponse.data.url;
        mediaType = uploadResponse.data.type;
      }

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/threads/${id}`,
        {
          title: editTitle,
          subtitle: editSubtitle,
          url: editUrl,
          media_url: mediaUrl,
          media_type: mediaType
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setEditMode(false);
      setEditUploading(false);
      fetchThread();
    } catch (error) {
      setError(error.response?.data?.error || 'スレッドの編集に失敗しました');
      setEditUploading(false);
    }
  };

  const handleEditFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // ファイルサイズチェック（50MB）
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('ファイルサイズは50MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('画像（JPEG, PNG, GIF, WebP）または動画（MP4, WebM, MOV）のみアップロード可能です');
      return;
    }

    setEditFile(selectedFile);
    setError('');

    // プレビュー生成
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setEditFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setEditFilePreview('video');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours());
    return date.toLocaleString('ja-JP', { 
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="container">読み込み中...</div>;
  }

  if (error && !thread) {
    return (
      <div className="container">
        <div className="header">
          <div className="header-title">
            <h1>DOGSO/UrawaReds</h1>
          </div>
          <div className="header-buttons">
            <Link to={`/${channel}`} className="button">
              ホーム
            </Link>
          </div>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const topLevelComments = comments.filter(c => !c.parent_id);

  return (
    <div className="container">
      <div className="header">
        <div className="header-title" onClick={() => window.location.href = `/${channel}`} style={{ cursor: 'pointer' }}>
          <h1>DOGSO/UrawaReds</h1>
        </div>
        <div className="header-buttons">
          {user ? (
            <>
              <Link to={`/${channel}/create`} className="button">
                ＋投稿
              </Link>
              <div className="menu-container">
                <button 
                  className="menu-button"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  ⋯
                </button>
                {showMenu && (
                  <div className="dropdown-menu">
                    <button onClick={handleLogout} className="dropdown-item">
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to={`/${channel}/login`} className="button">
              ログイン
            </Link>
          )}
        </div>
      </div>

      {thread && (
        <div className="thread-detail">
          {editMode ? (
            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="form-group">
                <label>タイトル</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>詳細（300文字以内）</label>
                <textarea
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="記事の要約や補足説明"
                  maxLength="300"
                  rows="5"
                />
                <small className="char-count">{editSubtitle.length}/300</small>
              </div>
              <div className="form-group">
                <label>URL（任意）</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>画像・動画（任意）</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleEditFileChange}
                />
                <small>50MB以下、画像（JPEG, PNG, GIF, WebP）または動画（MP4, WebM, MOV）</small>
              </div>

              {/* 現在のメディアまたは新しいプレビュー */}
              {editFilePreview ? (
                <div className="file-preview">
                  {editFilePreview === 'video' ? (
                    <div className="video-preview">📹 動画が選択されました</div>
                  ) : (
                    <img src={editFilePreview} alt="プレビュー" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditFile(null);
                      setEditFilePreview(null);
                    }}
                    className="button button-cancel"
                    style={{ marginTop: '8px' }}
                  >
                    削除
                  </button>
                </div>
              ) : thread.media_url && (
                <div className="file-preview">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>現在のメディア</p>
                  {thread.media_type === 'video' ? (
                    <video 
                      src={thread.media_url} 
                      controls
                      style={{ width: '100%', borderRadius: '8px' }}
                    />
                  ) : (
                    <img src={thread.media_url} alt="現在の画像" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                  )}
                </div>
              )}

              <div className="edit-buttons">
                <button type="submit" className="button button-primary" disabled={editUploading}>
                  {editUploading ? 'アップロード中...' : '保存'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditMode(false);
                    setEditTitle(thread.title);
                    setEditSubtitle(thread.subtitle || '');
                    setEditUrl(thread.url || '');
                    setEditFile(null);
                    setEditFilePreview(null);
                  }}
                  className="button button-secondary"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="thread-header-with-edit">
                <h1>{thread.title}</h1>
                {user && user.id === thread.user_id && (
                  <button 
                    onClick={() => setEditMode(true)} 
                    className="edit-button"
                  >
                    ✏️
                  </button>
                )}
              </div>
              {thread.subtitle && (
                <p className="thread-subtitle">{thread.subtitle}</p>
              )}
              {/* アップロードされたメディア（優先） */}
              {thread.media_url ? (
                <div className="thread-detail-thumbnail">
                  {thread.media_type === 'video' ? (
                    <video 
                      src={thread.media_url} 
                      controls
                      style={{ width: '100%', borderRadius: '16px' }}
                    />
                  ) : (
                    <img src={thread.media_url} alt={thread.title} />
                  )}
                </div>
              ) : thread.thumbnail && (
                <div className="thread-detail-thumbnail">
                  <img src={thread.thumbnail} alt={thread.title} />
                </div>
              )}
              {thread.tags && (
                <div className="thread-tags">
                  {thread.tags.split(' ').map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="thread-meta">
                <span>
                  {formatDate(thread.edited_at || thread.created_at)}
                  {thread.edited_at && <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>（編集済み）</span>}
                </span>
              </div>
              <div className="thread-actions">
                <button onClick={handleThreadLike} className="thread-action-button">
                  <span className="action-icon">❤️</span>
                  <span className="action-count">
                    {thread.reactions?.find(r => r.type === 'heart')?.count || 0}
                  </span>
                </button>
                <div className="thread-action-button">
                  <span className="action-icon">💬</span>
                  <span className="action-count">{comments.length}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="comments-section">
        <h2>コメント</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="comments-list">
          {topLevelComments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', padding: '20px 0' }}>
              まだコメントがありません
            </p>
          ) : (
            topLevelComments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                allComments={comments}
                user={user}
                onReaction={handleReaction}
                threadId={id}
                channel={channel}
              />
            ))
          )}
        </div>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="コメントを入力..."
              required
              rows="4"
            />
            <button type="submit" className="button button-primary">
              コメント
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            コメントを投稿するには <Link to={`/${channel}/login`}>ログイン</Link> が必要です
          </div>
        )}
      </div>
    </div>
  );
}

export default Thread;