import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

function CreateThread() {
  const navigate = useNavigate();
  const { channel } = useParams();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/${channel}/login`);
    }
  }, [navigate, channel]);

  const handleFileChange = (e) => {
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

    setFile(selectedFile);
    setError('');

    // プレビュー生成
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setFilePreview('video');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('ログインが必要です');
      setUploading(false);
      return;
    }

    if (subtitle.length > 100) {
      setError('サブタイトルは100文字以内にしてください');
      setUploading(false);
      return;
    }

    try {
      let mediaUrl = null;
      let mediaType = null;

      // ファイルがある場合、先にアップロード
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

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

      // スレッド作成
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/threads`,
        {
          title,
          subtitle,
          url,
          media_url: mediaUrl,
          media_type: mediaType
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      navigate(`/${channel}`);
    } catch (error) {
      console.error('投稿エラー:', error);
      setError(error.response?.data?.error || 'スレッドの作成に失敗しました');
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title" onClick={() => navigate(`/${channel}`)} style={{ cursor: 'pointer' }}>
          <h1>DOGSO/UrawaReds</h1>
        </div>
        <div className="header-buttons">
          <button 
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('create-thread-form').requestSubmit();
            }} 
            className="button"
            disabled={uploading}
          >
            {uploading ? 'アップロード中...' : '投稿'}
          </button>
        </div>
      </div>

      <div className="auth-container">
        <h1>新しい投稿</h1>

        {error && <div className="error-message">{error}</div>}

        <form id="create-thread-form" onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="投稿のタイトル"
              required
            />
          </div>

          <div className="form-group">
            <label>詳細（300文字以内）</label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="記事の要約や補足説明"
              maxLength="300"
              rows="5"
            />
            <small className="char-count">{subtitle.length}/300</small>
          </div>

          <div className="form-group">
            <label>URL（任意）</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label>画像・動画（任意）</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <small>50MB以下、画像（JPEG, PNG, GIF, WebP）または動画（MP4, WebM, MOV）</small>
          </div>

          {filePreview && (
            <div className="file-preview">
              {filePreview === 'video' ? (
                <div className="video-preview">📹 動画が選択されました</div>
              ) : (
                <img src={filePreview} alt="プレビュー" style={{ maxWidth: '100%', borderRadius: '8px' }} />
              )}
              <button 
                type="button" 
                onClick={() => {
                  setFile(null);
                  setFilePreview(null);
                }}
                className="button button-cancel"
                style={{ marginTop: '8px' }}
              >
                削除
              </button>
            </div>
          )}

          <button type="submit" className="button button-primary" disabled={uploading}>
            {uploading ? 'アップロード中...' : '投稿'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate(`/${channel}`)} 
            className="button button-secondary"
          >
            キャンセル
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateThread;