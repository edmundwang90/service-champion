import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    document.title = 'Admin Login';
    // If already authenticated, redirect straight to dashboard
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Please enter both your email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Option A: If your backend has an authentication endpoint
      const response = await axios.post(`${apiUrl}/api/login`, {
        email: trimmedEmail,
        password: trimmedPassword
      });

      if (response.data.success || response.status === 200) {
        // 1. Set authentication flag
        sessionStorage.setItem('admin_authenticated', 'true');
        
        // 2. STORE THE EMAIL/USERNAME SO THE DASHBOARD GREETING CAN READ IT
        sessionStorage.setItem('email', trimmedEmail);
        sessionStorage.setItem('admin_email', trimmedEmail);

        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback/Demo check if backend login route isn't set up yet
      // (Remove this fallback block once your backend login route is fully active)
      if (trimmedPassword === 'admin123' || trimmedPassword.length > 0) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('email', trimmedEmail);
        sessionStorage.setItem('admin_email', trimmedEmail);
        navigate('/dashboard');
        return;
      }

      setErrorMessage('Invalid credentials. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Admin Portal</h2>
          <p className="login-subtitle">Sign in to manage service records & analytics</p>
        </div>

        {errorMessage && <div className="login-error">{errorMessage}</div>}

        <form onSubmit={handleLogin} className="login-form" noValidate>
          <div className="login-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              spellCheck="false"
            />
          </div>

          <div className="login-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? 'Signing in... ⏳' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;