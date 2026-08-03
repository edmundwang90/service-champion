import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import serviceChampionImg from './service-champion.jpeg';
import './LandingPage.css';

function LandingPage() {
  const [badgeName, setBadgeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [galaxyId, setGalaxyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Create references to the input fields to manage focus
  const ernInputRef = useRef(null);
  const galaxyIdInputRef = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    if (value.length === 7) {
      value = value.slice(0, 6) + value.slice(6).toUpperCase();
    }
    setEmployeeId(value);
  };

  const handleGalaxyIdChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setGalaxyId(value);
  };

  // Scroll handler for iPad/Mobile keyboards
  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300); 
  };

  // --- KeyDown handlers for auto-focusing next input ---
  const handleBadgeNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      ernInputRef.current?.focus(); 
    }
  };

  const handleErnKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      galaxyIdInputRef.current?.focus(); 
    }
  };
  // ----------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); 

    const trimmedBadgeName = badgeName.trim();
    const trimmedEmpId = employeeId.trim();
    const trimmedGalaxyId = galaxyId.trim();

    // Validation checks...
    if (!trimmedBadgeName && !trimmedEmpId && !trimmedGalaxyId) {
      setErrorMessage('Please fill in Badge Name, ERN, and Galaxy ID.');
      return;
    }

    if (!trimmedBadgeName) {
      setErrorMessage('Please enter your Badge Name.');
      return;
    }

    if (trimmedBadgeName.length < 2 || trimmedBadgeName.length > 15) {
      setErrorMessage('Badge Name must be between 2 and 15 characters.');
      return;
    }

    const isValidName = /^[A-Za-z\s\-']+$/.test(trimmedBadgeName);
    if (!isValidName) {
      setErrorMessage('Badge Name can only contain letters, spaces, hyphens, and apostrophes.');
      return;
    }

    const blockList = ['admin', 'test', 'fake', 'dummy', 'crew']; 
    if (blockList.some(word => trimmedBadgeName.toLowerCase().includes(word))) {
      setErrorMessage('Please use your real cabin crew Badge Name.');
      return;
    }

    if (!trimmedEmpId) {
      setErrorMessage('Please enter your ERN.');
      return;
    }

    if (trimmedEmpId.length !== 7) {
      setErrorMessage('ERN must be exactly 7 characters long.');
      return;
    }

    const firstSixChars = trimmedEmpId.slice(0, 6);
    const areFirstSixDigits = /^\d{6}$/.test(firstSixChars);

    if (!areFirstSixDigits) {
      setErrorMessage('The first 6 characters of ERN must be numbers (e.g., 123456A).');
      return;
    }

    const lastChar = trimmedEmpId.charAt(6);
    const isLastCharAlphabet = /^[A-Z]$/.test(lastChar);

    if (!isLastCharAlphabet) {
      setErrorMessage('The last character of ERN must be a letter (e.g., 123456A).');
      return;
    }

    if (!trimmedGalaxyId) {
      setErrorMessage('Please enter your Galaxy ID.');
      return;
    }

    /* --- CHANGED: Now checks for a maximum length of 7 --- */
    if (trimmedGalaxyId.length > 7) {
      setErrorMessage('Galaxy ID must be a maximum of 7 characters long.');
      return;
    }

    const now = new Date();
    const campaignStart = new Date(2026, 6, 31, 0, 0, 0); 
    const campaignEnd = new Date(2026, 7, 31, 23, 59, 59);

    if (now >= campaignStart && now <= campaignEnd) {
      try {
        const response = await axios.get(`${apiUrl}/api/records`);
        const existingRecords = response.data;

        const hasParticipated = existingRecords.some((record) => {
          if (record.employeeId.toUpperCase() === trimmedEmpId.toUpperCase()) {
            const recordDate = new Date(record.createdAt || record.date);
            return recordDate >= campaignStart && recordDate <= campaignEnd;
          }
          return false;
        });

        if (hasParticipated) {
          setErrorMessage('You have already participated in this challenge. Only one entry is allowed per crew member.');
          return; 
        }
      } catch (error) {
        console.error('Error verifying participation status:', error);
        setErrorMessage('Network error while checking eligibility. Please ensure the backend is awake and try again.');
        return; 
      }
    }

    navigate('/challenge', { 
      state: { 
        badgeName: trimmedBadgeName, 
        employeeId: trimmedEmpId,
        galaxyId: trimmedGalaxyId
      } 
    });
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="form-container">
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

          <form className="landing-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Badge Name</label>
              <input 
                type="text" 
                value={badgeName} 
                onChange={handleBadgeNameChange}
                onFocus={handleFocus}
                onKeyDown={handleBadgeNameKeyDown} 
                enterKeyHint="next" 
                placeholder="e.g. John" 
                className="form-input"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ERN</label>
              <input 
                ref={ernInputRef} 
                type="text" 
                value={employeeId} 
                onChange={handleEmployeeIdChange}
                onFocus={handleFocus}
                onKeyDown={handleErnKeyDown} 
                enterKeyHint="next" 
                placeholder="e.g. 123456A" 
                maxLength={7} 
                className="form-input"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cathay ID</label>
              <input 
                ref={galaxyIdInputRef} 
                type="text" 
                value={galaxyId} 
                onChange={handleGalaxyIdChange}
                onFocus={handleFocus}
                enterKeyHint="go" 
                placeholder="e.g. CCAAXN" 
                /* --- CHANGED: maxLength updated to 7 --- */
                maxLength={7} 
                className="form-input"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="off"
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