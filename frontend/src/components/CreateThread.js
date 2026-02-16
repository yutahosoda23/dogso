import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';

function CreateThread() {
  const { channel } = useParams();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ログイン確認
    const token = localStorage.getItem('token');
    if (!token) {
      setError('スレッドを作成するにはログインが必要です');
      return;
    }

    // サブタイトルの文字数チェック
    if (subtitle.length > 100) {
      setError('サブタイトルは100文字以内にしてください');
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/threads`,
        { title, subtitle, url, tags },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // 作成したスレッドのページに移動
      navigate(`/${channel}/thread/${response.data.thread.id}`);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('ログインセッションが切れました。再度ログインしてください');
      } else {
        setError(error.response?.data?.error || 'スレッド作成に失敗しました');
      }
    }
  };

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

      <div className="auth-container">
        <h1>新規投稿</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="スレッドのタイトル"
            />
          </div>

          <div className="form-group">
            <label>サブタイトル（100文字以内）</label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="記事の要約や補足説明"
              maxLength="100"
              rows="3"
            />
            <small className="char-count">{subtitle.length}/100</small>
          </div>

          <div className="form-group">
            <label>URL *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://example.com/news-article"
            />
          </div>

          <div className="form-group">
            <label>ハッシュタグ（スペース区切り）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#ACL #移籍 #試合結果"
            />
            <small>例: #ACL #移籍 #試合結果</small>
          </div>

          <button type="submit" className="button button-primary">
            投稿する
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateThread;