import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

// トップレベルコメントコンポーネント
function TopLevelComment({ comment, replies, user, onReply, onReaction }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    await onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div className="comment-item">
      <div className="comment-card">
        <div className="comment-header">
          <strong>{comment.username}</strong>
          <span>{new Date(comment.created_at).toLocaleString('ja-JP')}</span>
        </div>
        
        <p className="comment-content">{comment.content}</p>
        
        <div className="comment-actions">
          <button onClick={() => onReaction(comment.id)} className="reaction-button">
            👍 {comment.reaction_count || 0}
          </button>
          
          {user && (
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)} 
              className="reply-button"
            >
              💬 返信
            </button>
          )}
          
          {replies.length > 0 && (
            <button 
              onClick={() => setCollapsed(!collapsed)} 
              className="collapse-button"
            >
              {collapsed ? '▶' : '▼'} {replies.length}件の返信
            </button>
          )}
        </div>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`${comment.username}さんへの返信...`}
              required
              rows="3"
            />
            <div className="reply-form-buttons">
              <button type="submit" className="button button-small">
                返信を投稿
              </button>
              <button 
                type="button" 
                onClick={() => setShowReplyForm(false)}
                className="button button-cancel"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 返信を表示（折りたたみ可能） */}
      {!collapsed && replies.length > 0 && (
        <div className="replies">
          {replies.map(reply => (
            <ReplyComment
              key={reply.id}
              reply={reply}
              topLevelCommentId={comment.id}
              user={user}
              onReply={onReply}
              onReaction={onReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 返信コメントコンポーネント（1階層のみ、折りたたみなし）
function ReplyComment({ reply, topLevelCommentId, user, onReply, onReaction }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    // 常にトップレベルコメントのIDをparent_idとして使用
    await onReply(topLevelCommentId, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div className="comment-item" style={{ marginLeft: '30px' }}>
      <div className="comment-card">
        <div className="comment-header">
          <strong>{reply.username}</strong>
          <span>{new Date(reply.created_at).toLocaleString('ja-JP')}</span>
        </div>
        
        <p className="comment-content">{reply.content}</p>
        
        <div className="comment-actions">
          <button onClick={() => onReaction(reply.id)} className="reaction-button">
            👍 {reply.reaction_count || 0}
          </button>
          
          {user && (
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)} 
              className="reply-button"
            >
              💬 返信
            </button>
          )}
        </div>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`${reply.username}さんへの返信...`}
              required
              rows="3"
            />
            <div className="reply-form-buttons">
              <button type="submit" className="button button-small">
                返信を投稿
              </button>
              <button 
                type="button" 
                onClick={() => setShowReplyForm(false)}
                className="button button-cancel"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Thread() {
  const { id } = useParams();
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
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');

  useEffect(() => {
    // ログインユーザー情報を取得
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    fetchThread();
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

  const handleThumbnailClick = (e, url) => {
    e.preventDefault();
    setSelectedUrl(url);
    setShowDialog(true);
  };

  const handleConfirmNavigation = () => {
    window.open(selectedUrl, '_blank', 'noopener,noreferrer');
    setShowDialog(false);
    setSelectedUrl('');
  };

  const handleCancelNavigation = () => {
    setShowDialog(false);
    setSelectedUrl('');
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

  const handleReaction = async (commentId = null) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('リアクションするにはログインが必要です');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          thread_id: commentId ? null : id,
          comment_id: commentId,
          type: 'like'
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
                thread_id: commentId ? null : id,
                comment_id: commentId,
                type: 'like'
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

const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('編集するにはログインが必要です');
      return;
    }

    // サブタイトルの文字数チェック
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

  if (loading) {
    return <div className="container">読み込み中...</div>;
  }

  if (error && !thread) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <Link to="/" className="back-link">← ホームに戻る</Link>
      </div>
    );
  }

  // トップレベルのコメント（parent_idがnullのもの）のみを取得
  const topLevelComments = comments.filter(c => !c.parent_id);

  // 各トップレベルコメントに対する返信をグループ化
  const commentGroups = topLevelComments.map(topComment => {
    const replies = comments.filter(c => c.parent_id === topComment.id);
    return {
      topComment,
      replies
    };
  });

return (
    <div className="container">
      <Link to="/" className="back-link">← ホームに戻る</Link>

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
              {thread.thumbnail && (
                <a 
                  href={thread.url} 
                  onClick={(e) => handleThumbnailClick(e, thread.url)}
                  className="thread-detail-thumbnail"
                >
                  <img src={thread.thumbnail} alt={thread.title} />
                </a>
              )}
              <div className="thread-header-with-edit">
                <h1>{thread.title}</h1>
                {user && user.id === thread.user_id && (
                  <button 
                    onClick={() => setEditMode(true)} 
                    className="edit-button"
                  >
                    ✏️ 編集
                  </button>
                )}
              </div>
              {thread.subtitle && (
                <p className="thread-subtitle">{thread.subtitle}</p>
              )}
              {thread.tags && (
                <div className="thread-tags">
                  {thread.tags.split(' ').map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="thread-meta">
                <span>投稿者: {thread.username}</span>
                <span>{new Date(thread.created_at).toLocaleString('ja-JP')}</span>
              </div>
              <button onClick={() => handleReaction()} className="reaction-button">
                👍 いいね
              </button>
            </>
          )}
        </div>
      )}

      <div className="comments-section">
        <h2>コメント ({comments.length})</h2>

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
              コメント投稿
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            コメントを投稿するには <Link to="/login">ログイン</Link> が必要です
          </div>
        )}

        <div className="comments-list">
          {commentGroups.length === 0 ? (
            <p>まだコメントがありません。最初のコメントを投稿しましょう！</p>
          ) : (
            commentGroups.map(({ topComment, replies }) => (
              <TopLevelComment
                key={topComment.id}
                comment={topComment}
                replies={replies}
                user={user}
                onReply={handleReply}
                onReaction={handleReaction}
              />
            ))
          )}
        </div>
      </div>

      {/* 外部リンク確認ダイアログ */}
      {showDialog && (
        <div className="dialog-overlay" onClick={handleCancelNavigation}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>外部リンクに遷移します</h3>
            <p className="dialog-url">{selectedUrl}</p>
            <div className="dialog-buttons">
              <button onClick={handleConfirmNavigation} className="button button-primary">
                遷移する
              </button>
              <button onClick={handleCancelNavigation} className="button button-cancel">
                もどる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Thread;