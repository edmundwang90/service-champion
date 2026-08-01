import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import serviceChampionImg from './service-champion.jpeg';
import './LandingPage.css';

function LandingPage() {
  const [badgeName, setBadgeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [galaxyId, setGalaxyId] = useState(''); // NEW STATE
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

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

  // NEW HANDLER: For Galaxy ID
  const handleGalaxyIdChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setGalaxyId(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); 

    const trimmedBadgeName = badgeName.trim();
    const trimmedEmpId = employeeId.trim();
    const trimmedGalaxyId = galaxyId.trim();

    // 1. Check if fields are empty
    if (!trimmedBadgeName && !trimmedEmpId && !trimmedGalaxyId) {
      setErrorMessage('Please fill in Badge Name, ERN, and Galaxy ID.');
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

    // 10. Check if Galaxy ID is empty
    if (!trimmedGalaxyId) {
      setErrorMessage('Please enter your Galaxy ID.');
      return;
    }

    // 11. Validate Galaxy ID length
    if (trimmedGalaxyId.length !== 6) {
      setErrorMessage('Galaxy ID must be exactly 6 characters long.');
      return;
    }

    // 12. Check database for previous participation
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

    // Pass all 3 variables in the router state
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
                placeholder="e.g. John" 
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

            {/* NEW UI: Galaxy ID Field */}
            <div className="form-group">
              <label className="form-label">GalaxyID</label>
              <input 
                type="text" 
                value={galaxyId} 
                onChange={handleGalaxyIdChange} 
                placeholder="e.g. CCAAXN" 
                maxLength={6} 
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