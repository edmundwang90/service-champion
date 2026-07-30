import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import serviceChampionImg from './service-champion.jpeg';
import './LandingPage.css';

function LandingPage() {
  const [badgeName, setBadgeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Dynamically set the browser tab title for the Landing Page
  useEffect(() => {
    document.title = 'A-Cart Challenge | Entry';
  }, []);

  const handleBadgeNameChange = (e) => {
    const value = e.target.value;
    if (value.length > 0) {
      const formattedName = value.charAt(0).toUpperCase() + value.slice(1);
      setBadgeName(formattedName);
    } else {
      setBadgeName('');
    }
  };

  const handleEmployeeIdChange = (e) => {
    // Real-time check: Remove spaces or special characters immediately as they type
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    
    // Auto-capitalize the 7th character as they type it
    if (value.length === 7) {
      value = value.slice(0, 6) + value.slice(6).toUpperCase();
    }
    
    setEmployeeId(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(''); 

    const trimmedBadgeName = badgeName.trim();
    const trimmedEmpId = employeeId.trim();

    // 1. Check if both fields are empty
    if (!trimmedBadgeName && !trimmedEmpId) {
      setErrorMessage('Please fill in both Badge Name and ERN.');
      return;
    }

    // 2. Check if Badge Name is empty
    if (!trimmedBadgeName) {
      setErrorMessage('Please enter your Badge Name.');
      return;
    }

    // 3. Validate Badge Name length 
    if (trimmedBadgeName.length < 2 || trimmedBadgeName.length > 15) {
      setErrorMessage('Badge Name must be between 2 and 15 characters.');
      return;
    }

    // 4. Validate Badge Name characters 
    const isValidName = /^[A-Za-z\s\-']+$/.test(trimmedBadgeName);
    if (!isValidName) {
      setErrorMessage('Badge Name can only contain letters, spaces, hyphens, and apostrophes.');
      return;
    }

    // 5. Blocklist Check for Badge Name 
    const blockList = ['admin', 'test', 'fake', 'dummy', 'crew']; 
    if (blockList.some(word => trimmedBadgeName.toLowerCase().includes(word))) {
      setErrorMessage('Please use your real cabin crew Badge Name.');
      return;
    }

    // 6. Check if ERN is empty
    if (!trimmedEmpId) {
      setErrorMessage('Please enter your ERN.');
      return;
    }

    // 7. Validate ERN length
    if (trimmedEmpId.length !== 7) {
      setErrorMessage('ERN must be exactly 7 characters long.');
      return;
    }

    // 8. Validate first 6 characters are numbers
    const firstSixChars = trimmedEmpId.slice(0, 6);
    const areFirstSixDigits = /^\d{6}$/.test(firstSixChars);

    if (!areFirstSixDigits) {
      setErrorMessage('The first 6 characters of ERN must be numbers (e.g., 123456A).');
      return;
    }

    // 9. Validate 7th character is an alphabet letter
    const lastChar = trimmedEmpId.charAt(6);
    const isLastCharAlphabet = /^[A-Z]$/.test(lastChar);

    if (!isLastCharAlphabet) {
      setErrorMessage('The last character of ERN must be a letter (e.g., 123456A).');
      return;
    }

    // If all checks pass, proceed to challenge
    navigate('/challenge', { 
      state: { 
        badgeName: trimmedBadgeName, 
        employeeId: trimmedEmpId 
      } 
    });
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        
        <div className="form-container">
          
          {/* Banner Image is now placed at the very top */}
          <div className="banner-container">
            <img 
              src={serviceChampionImg} 
              alt="Service Champion" 
              className="service-champion-img" 
            />
          </div>

          <div className="header-badge">
            Inflight Customer Service Delivery
          </div>

          <h2 className="landing-title">A-Cart Challenge 🚀</h2>
          <p className="landing-subtitle">Enter your details to begin</p>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          {/* noValidate stops default HTML browser alerts */}
          <form className="landing-form" onSubmit={handleSubmit} noValidate>
            
            <div className="form-group">
              <label className="form-label">Badge Name</label>
              <input 
                type="text" 
                value={badgeName} 
                onChange={handleBadgeNameChange} 
                placeholder="e.g. Roy" 
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ERN</label>
              <input 
                type="text" 
                value={employeeId} 
                onChange={handleEmployeeIdChange} 
                placeholder="e.g. 123456A" 
                maxLength={7} 
                className="form-input"
              />
            </div>

            <button type="submit" className="btn-submit">
              Start Challenge →
            </button>
            
          </form>
        </div>

      </div>
    </div>
  );
}

export default LandingPage;