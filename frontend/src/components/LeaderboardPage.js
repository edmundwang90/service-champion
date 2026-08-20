import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

function LeaderboardPage() {
  const [records, setRecords] = useState([]);
  
  // --- CHANGE: Automatically initialize to the Current Week instead of 'all' ---
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const date = new Date(today);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return String(monday.getTime());
  });

  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    document.title = 'Leaderboard';
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/records`);
        setRecords(response.data);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();

    const socket = io(apiUrl);

    socket.on('leaderboardUpdated', (updatedRecords) => {
      setRecords(updatedRecords);
    });

    return () => socket.disconnect();
  }, [apiUrl]);

  // --- LOGIC: Find the Monday of a given date ---
  const getMondayTime = (dateInput) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  };

  // --- LOGIC: Format the week label for the dropdown and title ---
  const getWeekLabel = (mondayTime, includeTag = true) => {
    const monday = new Date(Number(mondayTime));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); 

    const monMonth = monday.toLocaleString('default', { month: 'short' });
    const friMonth = friday.toLocaleString('default', { month: 'short' });
    const year = monday.getFullYear();

    let label = '';
    if (monMonth === friMonth) {
      label = `${monday.getDate()}-${friday.getDate()} ${monMonth} ${year}`;
    } else {
      label = `${monday.getDate()} ${monMonth} - ${friday.getDate()} ${friMonth} ${year}`;
    }

    if (!includeTag) return label;

    const currentMonday = getMondayTime(new Date());
    if (mondayTime === currentMonday) return `${label} (Current Week)`;
    if (mondayTime === currentMonday + (7 * 24 * 60 * 60 * 1000)) return `${label} (Coming Week)`;
    return label;
  };

  // --- LOGIC: Hardcode exactly 4 weeks (Coming, Current, Past 1, Past 2) ---
  const availableWeeks = useMemo(() => {
    const today = new Date();
    const currentMonday = getMondayTime(today);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    return [
      currentMonday + oneWeekMs,       // Coming Week
      currentMonday,                   // Current Week
      currentMonday - oneWeekMs,       // Past Week 1
      currentMonday - (2 * oneWeekMs)  // Past Week 2
    ];
  }, []);

  // --- LOGIC: Filter the records based on dropdown ---
  const filteredRecords = useMemo(() => {
    if (selectedWeek === 'all') return records;
    return records.filter(record => {
      const recordMonday = getMondayTime(record.createdAt || record.date);
      return recordMonday === Number(selectedWeek);
    });
  }, [records, selectedWeek]);


  const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const paddedMin = String(minutes).padStart(2, '0');
    const paddedSec = String(seconds).padStart(2, '0');
    
    return `${paddedMin}:${paddedSec}`;
  }; 

  const formatGalaxyId = (galaxyId) => {
    if (!galaxyId) return 'N/A';
    if (galaxyId.length <= 3) return '***'; 
    return galaxyId.substring(0, galaxyId.length - 3) + '***';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const topTenRecords = filteredRecords.slice(0, 10);
  const topThree = topTenRecords.slice(0, 3);
  const remainingRecords = topTenRecords.slice(3);

  const podiumOrder = [1, 0, 2];
  const medals = ['🥈', '🥇', '🥉'];

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        
        <div style={{ marginBottom: '35px', textAlign: 'center' }}>
          {/* TITLE WITH DYNAMIC DATE RANGE */}
          <h2 className="leaderboard-title" style={{ marginBottom: '15px' }}>
            Service Champion Leaderboard {selectedWeek === 'all' ? '(All-Time)' : `(${getWeekLabel(selectedWeek, false)})`} 🏆
          </h2> 
          
          {/* DROPDOWN MENU */}
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{
              padding: '8px 16px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          >
            <option value="all" style={{ color: '#000' }}>All-Time Records</option>
            {availableWeeks.map(weekTime => (
              <option key={weekTime} value={weekTime} style={{ color: '#000' }}>
                {getWeekLabel(weekTime, true)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="podium-container">
          {podiumOrder.map((recordIndex, displayIdx) => {
            const record = topThree[recordIndex];
            const actualRank = recordIndex + 1;
            return (
              <div key={recordIndex} className={`podium-box rank-${actualRank}`}>
                {actualRank === 1 && record && (
                  <div className="confetti-container">
                    {[...Array(20)].map((_, i) => {
                      const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#005D63'];
                      const randomColor = colors[Math.floor(Math.random() * colors.length)];
                      const randomLeft = Math.floor(Math.random() * 100) + '%';
                      const randomDelay = Math.random() * 3 + 's';
                      const randomDuration = Math.random() * 2 + 2 + 's';
                      return (
                        <div 
                          key={i} 
                          className="confetti-piece" 
                          style={{
                            backgroundColor: randomColor,
                            left: randomLeft,
                            animationDelay: randomDelay,
                            animationDuration: randomDuration
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <div className="podium-content">
                  <div className="podium-medal">{medals[displayIdx]}</div>
                  {record ? (
                    <>
                      <div className="podium-name" title={record.badgeName}>{record.badgeName}</div>
                      <div className="podium-time">{formatTime(record.timeTaken)}</div>
                    </>
                  ) : (
                    <div className="podium-empty">Available</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="table-container">
          <div className="table-scroll-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="rank-col-header">Rank</th>
                  <th>Badge Name</th>
                  <th>Cathay ID</th>
                  <th className="time-col-header">Time taken (MM:SS)</th>
                  <th className="date-col-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {remainingRecords.map((record, index) => (
                  <tr key={record._id || index}>
                    <td className="rank-col">#{index + 4}</td>
                    <td>{record.badgeName}</td>
                    <td>{formatGalaxyId(record.galaxyId)}</td>
                    <td className="time-col">
                      {formatTime(record.timeTaken)}
                    </td>
                    <td className="date-col">{formatDate(record.createdAt || record.date)}</td>
                  </tr>
                ))}
                {topTenRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">No records found for this week. Be the first to set the bar! 🚀</td>
                  </tr>
                )}
                {topTenRecords.length > 0 && remainingRecords.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">All current leaders are shown in the podium above! 🌟</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardPage;