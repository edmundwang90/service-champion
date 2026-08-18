import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ChallengePage from './components/ChallengePage';
import LeaderboardPage from './components/LeaderboardPage';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import './App.css';

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
  
  if (!isAuthenticated) {
    // Redirect to the login page if not authenticated, replacing the history state
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/challenge" element={<ChallengePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* --- Protected Dashboard Route --- */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;