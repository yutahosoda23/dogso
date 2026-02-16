import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, {
        email,
        password
      });

      // トークンとユーザー情報を保存
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // ホームページにリダイレクト
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'ログインに失敗しました');
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <h1>ログイン</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
            />
          </div>

          <button type="submit" className="button button-primary">
            ログイン
          </button>
        </form>

        <p className="auth-link">
          アカウントをお持ちでない方は <Link to="/register">こちらから登録</Link>
        </p>

        <Link to="/" className="back-link">← ホームに戻る</Link>
      </div>
    </div>
  );
}

export default Login;