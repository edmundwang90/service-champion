import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

function LoginPage() {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    document.title = 'Admin Login';
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        username: usernameInput,
        password: passwordInput
      });

      if (response.status === 200) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_username', response.data.username); // Optional: store who logged in
        navigate('/dashboard');
      }
    } catch (error) {
      setAuthError(error.response?.data?.error || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container auth-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">Admin Authentication</h2>
        <p className="auth-subtitle">Enter credentials to access dashboard</p>

        {authError && <div className="error-message">{authError}</div>}

        <form onSubmit={handleLoginSubmit} className="auth-form">
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase' }}>
              Username
            </label>
            <input 
              type="text" 
              placeholder="Enter username"
              className="login-input"
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase' }}>
              Password
            </label>
            <input 
              type="password" 
              placeholder="Enter password"
              className="login-input"
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-auth-login" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;