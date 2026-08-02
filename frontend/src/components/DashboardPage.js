import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import './DashboardPage.css';

function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to track sorting configuration
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    document.title = 'Admin Dashboard';
    fetchRecords();

    const socket = io(apiUrl);

    socket.on('leaderboardUpdated', (updatedRecords) => {
      setRecords(updatedRecords);
    });

    return () => socket.disconnect();
  }, [apiUrl]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: SORTING LOGIC ---
  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRecords = useMemo(() => {
    let sortableRecords = [...records];
    if (sortConfig !== null) {
      sortableRecords.sort((a, b) => {
        if (sortConfig.key === 'timeTaken') {
          return sortConfig.direction === 'ascending' 
            ? a.timeTaken - b.timeTaken 
            : b.timeTaken - a.timeTaken;
        }
        if (sortConfig.key === 'timestamp') {
          const dateA = new Date(a.createdAt || a.date).getTime();
          const dateB = new Date(b.createdAt || b.date).getTime();
          return sortConfig.direction === 'ascending' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        return 0;
      });
    }
    return sortableRecords;
  }, [records, sortConfig]);

  const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 1) {
      const minuteText = minutes === 1 ? 'min' : 'mins';
      return `${minutes} ${minuteText} ${seconds} sec`;
    } 
    return `${seconds} sec`;
  }; 

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getExcelDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getExcelTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // --- EXPORT TO EXCEL LOGIC ---
  const handleExportExcel = () => {
    if (sortedRecords.length === 0) return;

    // Use sortedRecords so the export matches what the admin sees on screen
    const excelData = sortedRecords.map((record, index) => ({
      'No.': index + 1,
      'Badge Name': record.badgeName || 'N/A',
      'ERN': record.employeeId || 'N/A', 
      'Galaxy ID': record.galaxyId || 'N/A',
      'Raw Time (ms)': record.timeTaken,
      'Formatted Time': formatTime(record.timeTaken),
      'Date': getExcelDate(record.createdAt || record.date),
      'Time': getExcelTime(record.createdAt || record.date),
      'Database ID': record._id
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Records');

    const fileName = `Campaign_Records_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        
        <div className="dashboard-header">
          <button 
            className="btn-excel-export" 
            onClick={handleExportExcel}
            disabled={sortedRecords.length === 0 || isLoading}
          >
            Download Excel
          </button>
        </div>
        
        <div className="dashboard-table-container">
          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="num-col-header">No.</th>
                  <th>Badge Name</th>
                  <th>ERN</th> 
                  <th>Galaxy ID</th>
                  {/* Clickable Sort Headers */}
                  <th 
                    className="time-col-header sortable-header" 
                    onClick={() => requestSort('timeTaken')}
                  >
                    Time Taken {sortConfig.key === 'timeTaken' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '↕'}
                  </th>
                  <th 
                    className="date-col-header sortable-header"
                    onClick={() => requestSort('timestamp')}
                  >
                    Timestamp {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '↕'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">Loading database records... ⏳</td>
                  </tr>
                ) : sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No records found in the database.</td>
                  </tr>
                ) : (
                  sortedRecords.map((record, index) => (
                    <tr key={record._id || index}>
                      <td className="num-col">{index + 1}</td>
                      <td>{record.badgeName}</td>
                      <td>{record.employeeId || 'N/A'}</td> 
                      <td>{record.galaxyId || 'N/A'}</td>
                      <td className="time-col">{formatTime(record.timeTaken)}</td>
                      <td className="date-col">{formatDate(record.createdAt || record.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;