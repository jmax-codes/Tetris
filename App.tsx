
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TetrisGame from './components/TetrisGame';
import MoviesPage from './components/MoviesPage';
import HistoryPage from './components/HistoryPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flicker">
        <Routes>
          <Route path="/" element={<TetrisGame />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
