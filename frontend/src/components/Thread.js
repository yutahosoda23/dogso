import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

// コメントコンポーネント
function Comment({ comment, allComments, user, onReply, onReaction }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // このコメントへの返信を取得
  const replies = allComments.filter(c => c.parent_id === comment.id);
  const isTopLevel = !comment.parent_id;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    await onReply(comment.parent_id || comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  const handleReplyClick = () => {
    setShowReplies(true);
    setShowReplyForm(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 9);
    
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
    
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="comment-item">
      <div className="comment-card">
        <div className="comment-header">
          <strong>{comment.username}</strong>
          <span>· {formatDate(comment.created_at)}</span>
        </div>
        
        <p className="comment-content">{comment.content}</p>
        
        <div className="comment-actions">
          {/* 返信ボタン（最左） */}
          {user && isTopLevel && (
            <button 
              onClick={handleReplyClick} 
              className="comment-action-button reply-button"
            >
              <span className="reply-icon">↩️</span>
              {replies.length > 0 && (
                <span className="reply-count">{replies.length}</span>
              )}
            </button>
          )}
          
          {/* リアクションボタン（4種類） */}
          {user && (
            <>
              <button 
                onClick={() => onReaction(comment.id, 'like')} 
                className="comment-action-button"
              >
                <span>👍</span>
                {comment.like_count > 0 && <span className="reply-count">{comment.like_count}</span>}
              </button>
              
              <button 
                onClick={() => onReaction(comment.id, 'heart')} 
                className="comment-action-button"
              >
                <span>❤️</span>
                {comment.heart_count > 0 && <span className="reply-count">{comment.heart_count}</span>}
              </button>
              
              <button 
                onClick={() => onReaction(comment.id, 'yellow')} 
                className="comment-action-button"
              >
                <span>🟨</span>
                {comment.yellow_count > 0 && <span className="reply-count">{comment.yellow_count}</span>}
              </button>
              
              <button 
                onClick={() => onReaction(comment.id, 'red')} 
                className="comment-action-button"
              >
                <span>🟥</span>
                {comment.red_count > 0 && <span className="reply-count">{comment.red_count}</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 返信を表示 */}
      {isTopLevel && showReplies && replies.length > 0 && (
        <div className="replies">
          {replies.map(reply => (
            <div key={reply.id} className="comment-item">
              <div className="comment-card">
                <div className="comment-header">
                  <strong>{reply.username}</strong>
                  <span>· {formatDate(reply.created_at)}</span>
                </div>
                
                <p className="comment-content">{reply.content}</p>
                
                {user && (
                  <div className="comment-actions">
                    <button 
                      onClick={() => onReaction(reply.id, 'like')} 
                      className="comment-action-button"
                    >
                      <span>👍</span>
                      {reply.like_count > 0 && <span className="reply-count">{reply.like_count}</span>}
                    </button>
                    
                    <button 
                      onClick={() => onReaction(reply.id, 'heart')} 
                      className="comment-action-button"
                    >
                      <span>❤️</span>
                      {reply.heart_count > 0 && <span className="reply-count">{reply.heart_count}</span>}
                    </button>
                    
                    <button 
                      onClick={() => onReaction(reply.id, 'yellow')} 
                      className="comment-action-button"
                    >
                      <span>🟨</span>
                      {reply.yellow_count > 0 && <span className="reply-count">{reply.yellow_count}</span>}
                    </button>
                    
                    <button 
                      onClick={() => onReaction(reply.id, 'red')} 
                      className="comment-action-button"
                    >
                      <span>🟥</span>
                      {reply.red_count > 0 && <span className="reply-count">{reply.red_count}</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 返信フォーム */}
      {isTopLevel && showReplyForm && (
        <div className="replies">
          <form onSubmit={handleReplySubmit} className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`${comment.username}さんへの返信...`}
              required
              rows="3"
            />
            <div className="reply-form-buttons">
              <button type="submit" className="button button-small button-primary">
                返信
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowReplyForm(false);
                  if (replies.length === 0) setShowReplies(false);
                }}
                className="button button-small button-cancel"
              >
                キャンセル
              </button>
            </div>
          </form>
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
  const [editTags, setEditTags] = useState('');

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
      setEditUrl(response.data.url);
      setEditTags(response.data.tags || '');
      setLoading(false);
    } catch (error) {
      console.error('スレッド取得エラー:', error);
      setError('スレッドの読み込みに失敗しました');
      setLoading(false);
    }
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

  const handleReply = async (parentId, content) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('返信するにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/comments`,
        {
          content: content,
          thread_id: id,
          parent_id: parentId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      fetchThread();
    } catch (error) {
      setError(error.response?.data?.error || '返信の投稿に失敗しました');
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
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          thread_id: id,
          type: 'heart'
        }
      );
      fetchThread();
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
          fetchThread();
        } catch (err) {
          console.error('リアクション削除エラー:', err);
        }
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('編集するにはログインが必要です');
      return;
    }

    if (editSubtitle.length > 100) {
      setError('サブタイトルは100文字以内にしてください');
      return;
    }

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/threads/${id}`,
        {
          title: editTitle,
          subtitle: editSubtitle,
          url: editUrl,
          tags: editTags
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setEditMode(false);
      fetchThread();
    } catch (error) {
      setError(error.response?.data?.error || 'スレッドの編集に失敗しました');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 9);
    return date.toLocaleString('ja-JP', { 
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
          <Link to={`/${channel}`} className="button">
            ホーム
          </Link>
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
                <label>サブタイトル（100文字以内）</label>
                <textarea
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="記事の要約や補足説明"
                  maxLength="100"
                  rows="3"
                />
                <small className="char-count">{editSubtitle.length}/100</small>
              </div>
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>ハッシュタグ（スペース区切り）</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="#技術 #ニュース #AI"
                />
              </div>
              <div className="edit-buttons">
                <button type="submit" className="button button-primary">
                  保存
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditMode(false);
                    setEditTitle(thread.title);
                    setEditSubtitle(thread.subtitle || '');
                    setEditUrl(thread.url);
                    setEditTags(thread.tags || '');
                  }}
                  className="button button-cancel"
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
              {thread.thumbnail && (
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
                <span>{formatDate(thread.created_at)}</span>
              </div>
              <div className="thread-actions">
                <button onClick={handleThreadLike} className="thread-action-button">
                  <span className="action-icon">❤️</span>
                  <span className="action-count">{thread.reaction_count || 0}</span>
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
                onReply={handleReply}
                onReaction={handleReaction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Thread;