import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

function CommentDetail() {
  const { id, channel, commentId } = useParams();
  const [thread, setThread] = useState(null);
  const [comment, setComment] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchCommentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  const fetchCommentDetail = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/threads/${id}`);
      setThread(response.data);
      
      const allComments = response.data.comments || [];
      const targetComment = allComments.find(c => c.id === parseInt(commentId));
      const commentReplies = allComments.filter(c => c.parent_id === parseInt(commentId));
      
      setComment(targetComment);
      setReplies(commentReplies);
      setLoading(false);
    } catch (error) {
      console.error('コメント取得エラー:', error);
      setError('コメントの読み込みに失敗しました');
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

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('返信するにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/comments`,
        {
          content: newReply,
          thread_id: id,
          parent_id: commentId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setNewReply('');
      fetchCommentDetail();
    } catch (error) {
      setError(error.response?.data?.error || '返信の投稿に失敗しました');
    }
  };

  const handleReaction = async (targetCommentId, type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('リアクションするにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          comment_id: targetCommentId,
          type: type
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      fetchCommentDetail();
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
                comment_id: targetCommentId,
                type: type
              }
            }
          );
          fetchCommentDetail();
        } catch (err) {
          console.error('リアクション削除エラー:', err);
        }
      } else {
        setError('リアクションに失敗しました');
      }
    }
  };

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

  if (loading) {
    return <div className="container">読み込み中...</div>;
  }

  if (error && !comment) {
    return (
      <div className="container">
        <div className="header">
          <div className="header-title" onClick={() => window.location.href = `/${channel}`} style={{ cursor: 'pointer' }}>
            <h1>DOGSO/UrawaReds</h1>
          </div>
          <div className="header-buttons">
            <Link to={`/${channel}/thread/${id}`} className="button">
              戻る
            </Link>
          </div>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

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

      {/* 戻るリンク */}
      <div style={{ padding: '16px' }}>
        <Link 
          to={`/${channel}/thread/${id}`} 
          style={{ 
            color: 'var(--reds-primary)', 
            textDecoration: 'none',
            fontSize: '15px'
          }}
        >
          ← スレッドに戻る
        </Link>
      </div>

      {/* 元のコメント */}
      {comment && (
        <div className="comment-detail-main">
          <div className="comment-card">
            <div className="comment-header">
              <strong>{comment.username}</strong>
              <span>· {formatDate(comment.created_at)}</span>
            </div>
            
            <p className="comment-content">{comment.content}</p>
            
            {user && (
              <div className="comment-actions">
                <button 
                  onClick={() => handleReaction(comment.id, 'like')} 
                  className="comment-action-button"
                >
                  <span>👍</span>
                  {comment.like_count > 0 && <span className="reply-count">{comment.like_count}</span>}
                </button>
                
                <button 
                  onClick={() => handleReaction(comment.id, 'heart')} 
                  className="comment-action-button"
                >
                  <span>❤️</span>
                  {comment.heart_count > 0 && <span className="reply-count">{comment.heart_count}</span>}
                </button>
                
                <button 
                  onClick={() => handleReaction(comment.id, 'yellow')} 
                  className="comment-action-button"
                >
                  <span>🟨</span>
                  {comment.yellow_count > 0 && <span className="reply-count">{comment.yellow_count}</span>}
                </button>
                
                <button 
                  onClick={() => handleReaction(comment.id, 'red')} 
                  className="comment-action-button"
                >
                  <span>🟥</span>
                  {comment.red_count > 0 && <span className="reply-count">{comment.red_count}</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 返信セクション */}
      <div className="comments-section">
        <h2>返信</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="comments-list">
          {replies.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', padding: '20px 0' }}>
              まだ返信がありません
            </p>
          ) : (
            replies.map((reply) => (
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
                        onClick={() => handleReaction(reply.id, 'like')} 
                        className="comment-action-button"
                      >
                        <span>👍</span>
                        {reply.like_count > 0 && <span className="reply-count">{reply.like_count}</span>}
                      </button>
                      
                      <button 
                        onClick={() => handleReaction(reply.id, 'heart')} 
                        className="comment-action-button"
                      >
                        <span>❤️</span>
                        {reply.heart_count > 0 && <span className="reply-count">{reply.heart_count}</span>}
                      </button>
                      
                      <button 
                        onClick={() => handleReaction(reply.id, 'yellow')} 
                        className="comment-action-button"
                      >
                        <span>🟨</span>
                        {reply.yellow_count > 0 && <span className="reply-count">{reply.yellow_count}</span>}
                      </button>
                      
                      <button 
                        onClick={() => handleReaction(reply.id, 'red')} 
                        className="comment-action-button"
                      >
                        <span>🟥</span>
                        {reply.red_count > 0 && <span className="reply-count">{reply.red_count}</span>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <form onSubmit={handleReplySubmit} className="comment-form">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="返信を入力..."
              required
              rows="4"
            />
            <button type="submit" className="button button-primary">
              返信
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            返信するには <Link to={`/${channel}/login`}>ログイン</Link> が必要です
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentDetail;