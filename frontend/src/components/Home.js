import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const { channel } = useParams();
  const navigate = useNavigate();
  const [channelData, setChannelData] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchChannelAndThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  const fetchChannelAndThreads = async () => {
    try {
      const channelResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/channels/${channel}`);
      setChannelData(channelResponse.data);

      const threadsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/threads?channel=${channel}`);
      setThreads(threadsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('データ取得エラー:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowMenu(false);
    navigate(`/${channel}`);
  };

  const handleLike = async (e, threadId) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reactions`,
        {
          thread_id: threadId,
          type: 'heart'
        }
      );
      fetchChannelAndThreads();
    } catch (error) {
      if (error.response?.data?.error?.includes('既に')) {
        // 既にリアクション済み → 削除
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_URL}/api/reactions`,
            {
              data: {
                thread_id: threadId,
                type: 'heart'
              }
            }
          );
          fetchChannelAndThreads();
        } catch (err) {
          console.error('リアクション削除エラー:', err);
        }
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

  if (!channelData) {
    return (
      <div className="container">
        <div className="error-message">チャンネルが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-title" onClick={() => navigate(`/${channel}`)} style={{ cursor: 'pointer' }}>
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

      <div className="feed-list">
        {threads.length === 0 ? (
          <div className="empty-feed">
            <p>まだ投稿がありません</p>
            <p style={{ fontSize: '14px', marginTop: '8px', color: '#999' }}>
              最初の投稿をしてみましょう！
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="feed-card">
              <div className="feed-header">
                <span className="feed-author">{thread.username}</span>
                <span className="feed-time">· {formatDate(thread.created_at)}</span>
              </div>
              
              <Link 
                to={`/${channel}/thread/${thread.id}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h2 className="feed-title-large">{thread.title}</h2>
              </Link>
              
              {thread.thumbnail && (
                <Link 
                  to={`/${channel}/thread/${thread.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="thread-detail-thumbnail">
                    <img src={thread.thumbnail} alt={thread.title} />
                  </div>
                </Link>
              )}
              
              {thread.tags && (
                <div className="thread-tags">
                  {thread.tags.split(' ').map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="thread-actions">
                <button
                  className="thread-action-button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLike(e, thread.id);
                  }}
                >
                  <span className="action-icon">❤️</span>
                  <span className="action-count">{thread.reaction_count || 0}</span>
                </button>
                
                <Link 
                  to={`/${channel}/thread/${thread.id}`} 
                  className="thread-action-button"
                >
                  <span className="action-icon">💬</span>
                  <span className="action-count">{thread.comment_count || 0}</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;