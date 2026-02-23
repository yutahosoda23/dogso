import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Thread from './components/Thread';
import Login from './components/Login';
import Register from './components/Register';
import CreateThread from './components/CreateThread';
import CommentDetail from './components/CommentDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* ルートアクセスは /urawa にリダイレクト */}
          <Route path="/" element={<Navigate to="/urawa" replace />} />
          
          {/* チャンネルページ */}
          <Route path="/:channel" element={<Home />} />
          
          {/* スレッド詳細 */}
          <Route path="/:channel/thread/:id" element={<Thread />} />
          <Route path="/:channel/thread/:id/comment/:commentId" element={<CommentDetail />} />
          
          {/* 認証・投稿 */}
          <Route path="/:channel/login" element={<Login />} />
          <Route path="/:channel/register" element={<Register />} />
          <Route path="/:channel/create" element={<CreateThread />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;