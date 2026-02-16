import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const { channel } = useParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/register`, {
        username,
        email,
        password
      });

      // トークンとユーザー情報を保存
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // ホームページにリダイレクト
      navigate(`/${channel}`);
    } catch (error) {
      setError(error.response?.data?.error || '登録に失敗しました');
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
        <h1>新規登録</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="ユーザー名"
            />
          </div>

          <div className="form-group">
            <label>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="パスワード"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>パスワード確認</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="パスワード（確認）"
              minLength="6"
            />
          </div>

          <button type="submit" className="button button-primary">
            登録
          </button>
        </form>

        <p className="auth-link">
          既にアカウントをお持ちの方は <Link to={`/${channel}/login`}>こちらからログイン</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
