import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Thread from './components/Thread';
import Login from './components/Login';
import Register from './components/Register';
import CreateThread from './components/CreateThread';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/thread/:id" element={<Thread />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create" element={<CreateThread />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;