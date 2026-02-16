import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');

  // スレッド一覧を取得
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/threads`);
      setThreads(response.data);
      setLoading(false);
    } catch (error) {
      console.error('スレッド取得エラー:', error);
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

  if (loading) {
    return <div className="container">読み込み中...</div>;
  }

 return (
    <div className="container">
      <div className="header">
        <h1>Dogso - ニュース掲示板</h1>
        <div className="header-buttons">
          <Link to="/create" className="button">新規スレッド作成</Link>
          <Link to="/login" className="button">ログイン</Link>
          <Link to="/register" className="button">登録</Link>
        </div>
      </div>

      <div className="threads-list">
        {threads.length === 0 ? (
          <p>まだスレッドがありません。最初のスレッドを作成しましょう！</p>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="thread-card">
              <Link to={`/thread/${thread.id}`} className="thread-card-link">
                <div className="thread-card-content">
                  {thread.thumbnail && (
                    <div
                      className="thread-thumbnail"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleThumbnailClick(e, thread.url);
                      }}
                    >
                      <img src={thread.thumbnail} alt={thread.title} />
                    </div>
                  )}
                  <div className="thread-text">
                    <h2>{thread.title}</h2>
                    <div className="thread-meta">
                      <span>投稿者: {thread.username}</span>
                      <span>コメント: {thread.comment_count}</span>
                      <span>リアクション: {thread.reaction_count}</span>
                      <span>{new Date(thread.created_at).toLocaleString('ja-JP')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
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

export default Home;