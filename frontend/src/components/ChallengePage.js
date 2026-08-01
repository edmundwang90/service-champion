import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChallengePage.css'; 

function ChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); 
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    document.title = 'Challenge';
  }, []);

  // Security: Redirect if refreshed or accessed directly without required details
  useEffect(() => {
    if (!location?.state?.employeeId || !location?.state?.galaxyId) {
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  if (!location?.state?.employeeId || !location?.state?.galaxyId) return null; 

  const handleStartStop = () => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsCompleted(true);
    } else {
      setIsRunning(true);
      setIsCompleted(false);
      const startTime = Date.now() - timeElapsed;
      intervalRef.current = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 10); 
    }
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsCompleted(false);
    setTimeElapsed(0);
  };

  const handleSubmitScore = async () => {
    setIsSaving(true);
    try {
      const payload = {
        badgeName: location.state.badgeName,
        employeeId: location.state.employeeId,
        galaxyId: location.state.galaxyId, 
        timeTaken: timeElapsed
      };

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      await axios.post(`${apiUrl}/api/records`, payload);
      setShowSplash(true);

    } catch (error) {
      console.error("Submission Error Details:", error.response || error);
      alert(`Error saving time: ${error.response?.data?.error || error.message}`);
      setIsSaving(false);
    }
  };

  const formatSplashTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 1) {
      const minuteText = mins === 1 ? 'minute' : 'minutes';
      return `${mins} ${minuteText} and ${secs} seconds`;
    } 
    return `${secs} seconds`;
  };

  const minutes = Math.floor(timeElapsed / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((timeElapsed % 60000) / 1000).toString().padStart(2, '0');
  const centiseconds = Math.floor((timeElapsed % 1000) / 10).toString().padStart(2, '0');

  return (
    <div className="challenge-container">
      {showSplash ? (
        <div className="splash-card fade-in">
          <div className="splash-icon">✅</div>
          <h2 className="splash-title">Thank You, {location.state.badgeName}!</h2>
          <p className="splash-subtitle">Your time has been officially recorded.</p>
          <div className="splash-time-display" style={{ fontSize: '18px', marginBottom: '20px' }}>
            Final Time: <span style={{ fontWeight: 'bold', color: '#fce18a' }}>{formatSplashTime(timeElapsed)}</span>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="timer-btn btn-pink"
            style={{ marginTop: '20px', minWidth: '150px' }}
          >
            Start New Challenge
          </button>
        </div>
      ) : (
        <div className="timer-card">
          <div className="timer-header">
            Crew: {location.state.badgeName} ({location.state.employeeId}) | GLX: {location.state.galaxyId}
          </div>
          <div className="timer-display">
            <div className="time-block">
              <span className="time-number">{minutes}</span>
              <span className="time-label">Minutes</span>
            </div>
            <span className="time-colon">:</span>
            <div className="time-block">
              <span className="time-number">{seconds}</span>
              <span className="time-label">Seconds</span>
            </div>
            <span className="time-colon">:</span>
            <div className="time-block">
              <span className="time-number">{centiseconds}</span>
              <span className="time-label">milliseconds</span>
            </div>
          </div>

          <div className="button-group">
            <button 
              onClick={handleStartStop} 
              className="timer-btn btn-pink"
            >
              {isRunning ? 'Pause' : (timeElapsed === 0 ? 'Start' : 'Resume')}
            </button>
            
            {/* RESET BUTTON */}
            <button 
              onClick={handleReset} 
              className="timer-btn btn-dark"
              disabled={timeElapsed === 0 && !isRunning}
            >
              Reset
            </button>

            <button 
              onClick={handleSubmitScore} 
              className="timer-btn btn-dark"
              disabled={!isCompleted || isSaving || timeElapsed === 0}
            >
              {isSaving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChallengePage;