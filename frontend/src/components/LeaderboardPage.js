import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

function LeaderboardPage() {
  const [records, setRecords] = useState([]);
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

  // UPDATED: Now uses the consistent MM:SS format with padded zeros
  const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Pad single digits with a leading zero (e.g., 5 becomes "05")
    const paddedMin = String(minutes).padStart(2, '0');
    const paddedSec = String(seconds).padStart(2, '0');
    
    return `${paddedMin}:${paddedSec}`;
  }; 

  const formatEmpId = (empId) => {
    if (!empId) return '';
    if (empId.length !== 7) return empId; 
    return `${empId.substring(0, 2)}****${empId.substring(6)}`;
  };

  // NEW FUNCTION: Hide the last three characters of the Galaxy ID
  const formatGalaxyId = (galaxyId) => {
    if (!galaxyId) return 'N/A';
    // If the ID is 3 characters or less, just replace it all with asterisks
    if (galaxyId.length <= 3) return '***'; 
    
    // Keep everything up to the last 3 characters, then append '***'
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

  // --- STRICT CAMPAIGN DATE LOGIC ---
  const getCampaignWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
    const month = today.getMonth(); // 7 is August (0-indexed)
    const year = today.getFullYear();

    // If today is a weekend (0 or 6) OR we are not in August 2026, show N/A
    if (dayOfWeek === 0 || dayOfWeek === 6 || month !== 7 || year !== 2026) {
      return 'N/A';
    }

    // Otherwise, we are inside an active campaign week. Calculate the Mon-Fri range.
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1)); // Snap back to the current week's Monday

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // Friday is 4 days after Monday

    const monMonth = monday.toLocaleString('default', { month: 'short' });
    const friMonth = friday.toLocaleString('default', { month: 'short' });
    const currentYear = monday.getFullYear();

    // Dynamically formats string (e.g., "3-7 Aug 2026" or "31 Aug - 4 Sep 2026")
    if (monMonth === friMonth) {
      return `${monday.getDate()}-${friday.getDate()} ${monMonth} ${currentYear}`;
    } else {
      return `${monday.getDate()} ${monMonth} - ${friday.getDate()} ${friMonth} ${currentYear}`;
    }
  };

  const topTenRecords = records.slice(0, 10);
  const topThree = topTenRecords.slice(0, 3);
  const remainingRecords = topTenRecords.slice(3);

  const podiumOrder = [1, 0, 2];
  const medals = ['🥈', '🥇', '🥉'];
  const labels = ['2nd Place', '1st Place', '3rd Place'];

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        
        {/* INLINE DYNAMIC DATE IN THE TITLE */}
        <h2 className="leaderboard-title">Service Champion Leaderboard ({getCampaignWeekRange()}) 🏆</h2> 
        
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
                  {/* <div className="podium-rank-label">{labels[displayIdx]}</div> */}
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
                  {/* <th className="ern-col-header">ERN</th> */}
                  {/* NEW COLUMN */}
                  <th>Cathay ID</th>
                  <th className="time-col-header">Time (MM:SS)</th>
                  <th className="date-col-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {remainingRecords.map((record, index) => (
                  <tr key={record._id || index}>
                    <td className="rank-col">#{index + 4}</td>
                    <td>{record.badgeName}</td>
                    {/* <td className="ern-col">{formatEmpId(record.employeeId)}</td> */}
                    {/* UPDATED DATA CELL USING NEW FUNCTION */}
                    <td>{formatGalaxyId(record.galaxyId)}</td>
                    <td className="time-col">
                      {formatTime(record.timeTaken)}
                    </td>
                    <td className="date-col">{formatDate(record.createdAt || record.date)}</td>
                  </tr>
                ))}
                {topTenRecords.length === 0 && (
                  <tr>
                    {/* UPDATED: colSpan is now 6 to span all columns */}
                    <td colSpan="6" className="empty-state">No records yet. Be the first to set the bar! 🚀</td>
                  </tr>
                )}
                {topTenRecords.length > 0 && remainingRecords.length === 0 && (
                  <tr>
                    {/* UPDATED: colSpan is now 6 */}
                    <td colSpan="6" className="empty-state">All current leaders are shown in the podium above! 🌟</td>
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