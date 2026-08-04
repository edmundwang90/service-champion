import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import './DashboardPage.css';

function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [searchQuery, setSearchQuery] = useState(''); 

  // Graph Modal Overlay State
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState(''); 
  const [formData, setFormData] = useState({
    badgeName: '',
    employeeId: '',
    galaxyId: '',
    timeTaken: ''
  });

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

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

  // --- CRUD OPERATIONS ---

  const handleOpenModal = (record = null) => {
    setErrorMessage(''); 
    if (record) {
      setEditingRecord(record);
      setFormData({
        badgeName: record.badgeName || '',
        employeeId: record.employeeId || '',
        galaxyId: record.galaxyId || '',
        timeTaken: record.timeTaken || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({ badgeName: '', employeeId: '', galaxyId: '', timeTaken: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setErrorMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'badgeName' && value.length > 0) {
      formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
    } else if (name === 'employeeId') {
      formattedValue = value.replace(/[^a-zA-Z0-9]/g, '');
      if (formattedValue.length === 7) {
        formattedValue = formattedValue.slice(0, 6) + formattedValue.slice(6).toUpperCase();
      }
    } else if (name === 'galaxyId') {
      formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedBadgeName = formData.badgeName.trim();
    const trimmedEmpId = formData.employeeId.trim();
    const trimmedGalaxyId = formData.galaxyId.trim();

    if (!trimmedBadgeName || !trimmedEmpId || !trimmedGalaxyId || !formData.timeTaken) {
      setErrorMessage('Please fill in all fields.');
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
      setErrorMessage('Please use a real cabin crew Badge Name.');
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

    if (trimmedGalaxyId.length > 7) {
      setErrorMessage('Galaxy ID must be a maximum of 7 characters long.');
      return;
    }

    const validatedData = {
      ...formData,
      badgeName: trimmedBadgeName,
      employeeId: trimmedEmpId,
      galaxyId: trimmedGalaxyId,
      ...(editingRecord && { updatedAt: new Date().toISOString() })
    };

    try {
      if (editingRecord) {
        await axios.put(`${apiUrl}/api/records/${editingRecord._id}`, validatedData);
      } else {
        await axios.post(`${apiUrl}/api/records`, validatedData);
      }
      fetchRecords(); 
      handleCloseModal();
    } catch (error) {
      console.error("Error saving record:", error);
      setErrorMessage("Failed to save record. Check backend connection.");
    }
  };

  const handleDeleteClick = (id) => {
    setRecordToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRecordToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await axios.delete(`${apiUrl}/api/records/${recordToDelete}`);
      fetchRecords(); 
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record.");
    }
  };

  // --- SORTING & FILTERING LOGIC ---
  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return ' ↕';
  };

  const filteredAndSortedRecords = useMemo(() => {
    let processedRecords = records;
    if (searchQuery) {
      const upperQuery = searchQuery.toUpperCase();
      processedRecords = records.filter(record => 
        record.badgeName?.toUpperCase().includes(upperQuery) ||
        record.employeeId?.toUpperCase().includes(upperQuery) ||
        record.galaxyId?.toUpperCase().includes(upperQuery)
      );
    }

    let sortableRecords = [...processedRecords];
    if (sortConfig !== null) {
      sortableRecords.sort((a, b) => {
        if (sortConfig.key === 'timeTaken') {
          return sortConfig.direction === 'ascending' 
            ? a.timeTaken - b.timeTaken 
            : b.timeTaken - a.timeTaken;
        }
        if (sortConfig.key === 'date' || sortConfig.key === 'time' || sortConfig.key === 'timestamp') {
          const dateA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
          return sortConfig.direction === 'ascending' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        return 0;
      });
    }
    return sortableRecords;
  }, [records, sortConfig, searchQuery]);

  // --- PREPARE DATA FOR SCATTER PLOT ---
  const scatterPlotData = useMemo(() => {
    return filteredAndSortedRecords.map((record, index) => {
      const recordDate = new Date(record.updatedAt || record.createdAt || record.date);
      return {
        index: index + 1,
        timeInSeconds: Number((record.timeTaken / 1000).toFixed(2)),
        badgeName: record.badgeName || 'Unknown',
        employeeId: record.employeeId || 'N/A',
        formattedDate: !isNaN(recordDate.getTime()) ? recordDate.toLocaleDateString() : 'N/A'
      };
    });
  }, [filteredAndSortedRecords]);

  // --- FORMATTERS ---
  const formatTimeTaken = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const paddedMin = String(minutes).padStart(2, '0');
    const paddedSec = String(seconds).padStart(2, '0');
    
    return `${paddedMin}:${paddedSec}`;
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
    if (filteredAndSortedRecords.length === 0) return;

    const excelData = filteredAndSortedRecords.map((record, index) => ({
      'No.': index + 1,
      'Badge Name': record.badgeName || 'N/A',
      'ERN': record.employeeId || 'N/A', 
      'Galaxy ID': record.galaxyId || 'N/A',
      'Raw Time (ms)': record.timeTaken,
      'Formatted Time': formatTimeTaken(record.timeTaken),
      'Date': getExcelDate(record.updatedAt || record.createdAt || record.date),
      'Time': getExcelTime(record.updatedAt || record.createdAt || record.date),
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
          {/* Search Bar */}
          <div className="search-container">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by Badge Name, ERN, or Cathay ID" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="header-actions">
            <button className="btn-add-record" onClick={() => handleOpenModal()}>
              Add New Record
            </button>
            <button 
              className="btn-excel-export" 
              onClick={handleExportExcel}
              disabled={filteredAndSortedRecords.length === 0 || isLoading}
            >
              Download Excel
            </button>
            <button className="btn-view-graph" onClick={() => setIsGraphModalOpen(true)}>
              View Graph
            </button>
          </div>
        </div>
        
        {/* Full Table View */}
        <div className="dashboard-table-container">
          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="num-col-header">No.</th>
                  <th>Badge Name</th>
                  <th>ERN</th> 
                  <th>Cathay ID</th>
                  <th 
                    className="time-col-header sortable-header" 
                    onClick={() => requestSort('timeTaken')}
                  >
                    Time Taken <span className="sort-icon">{getSortIcon('timeTaken')}</span>
                  </th>
                  <th 
                    className="date-col-header sortable-header"
                    onClick={() => requestSort('date')}
                  >
                    Date <span className="sort-icon">{getSortIcon('date')}</span>
                  </th>
                  <th 
                    className="time-of-day-col-header sortable-header"
                    onClick={() => requestSort('time')}
                  >
                    Last Updated <span className="sort-icon">{getSortIcon('time')}</span>
                  </th>
                  <th className="actions-col-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="empty-state">Loading database records... ⏳</td>
                  </tr>
                ) : filteredAndSortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      {searchQuery ? 'No records match your search criteria.' : 'No records found in the database.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRecords.map((record, index) => (
                    <tr key={record._id || index}>
                      <td className="num-col">{index + 1}</td>
                      <td>{record.badgeName}</td>
                      <td>{record.employeeId || 'N/A'}</td> 
                      <td>{record.galaxyId || 'N/A'}</td>
                      <td className="time-col">{formatTimeTaken(record.timeTaken)}</td>
                      <td className="date-col">{getExcelDate(record.updatedAt || record.createdAt || record.date)}</td>
                      <td className="time-of-day-col">{getExcelTime(record.updatedAt || record.createdAt || record.date)}</td>
                      <td className="actions-col">
                        <button className="btn-edit" onClick={() => handleOpenModal(record)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDeleteClick(record._id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- GRAPH MODAL OVERLAY --- */}
      {isGraphModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGraphModalOpen(false)}>
          <div className="modal-content graph-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="graph-modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>Performance Distribution Scatter Plot</h3>
              <button className="graph-close-btn" onClick={() => setIsGraphModalOpen(false)}>✕</button>
            </div>
            
            <div style={{ width: '100%', height: '400px', marginTop: '10px' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255, 255, 255, 0.6)' }}>Loading chart visualization...</div>
              ) : scatterPlotData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255, 255, 255, 0.6)' }}>No data available for plotting.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      type="number" 
                      dataKey="index" 
                      name="Entry" 
                      stroke="#ffffff" 
                      tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                      label={{ value: 'Participant Index', position: 'bottom', fill: 'rgba(255, 255, 255, 0.8)', offset: 0 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="timeInSeconds" 
                      name="Time" 
                      unit="s" 
                      stroke="#ffffff" 
                      tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                      label={{ value: 'Time Taken (Seconds)', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.8)' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: '#002b2e', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 14px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#fce18a' }}>{data.badgeName}</p>
                              <p style={{ margin: '0 0 3px 0', fontSize: '13px' }}>ERN: {data.employeeId}</p>
                              <p style={{ margin: '0 0 3px 0', fontSize: '13px' }}>Time: {data.timeInSeconds}s</p>
                              <p style={{ margin: '0', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Date: {data.formattedDate}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Participants" data={scatterPlotData} fill="#fce18a" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingRecord ? 'Edit Record' : 'Add New Record'}</h3>
            
            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="modal-form" noValidate>
              <div className="modal-group">
                <label>Badge Name</label>
                <input required type="text" name="badgeName" value={formData.badgeName} onChange={handleInputChange} autoComplete="off" spellCheck="false" />
              </div>
              <div className="modal-group">
                <label>ERN (Employee ID)</label>
                <input required type="text" name="employeeId" value={formData.employeeId} onChange={handleInputChange} maxLength={7} autoComplete="off" spellCheck="false" />
              </div>
              <div className="modal-group">
                <label>Cathay ID</label>
                <input required type="text" name="galaxyId" value={formData.galaxyId} onChange={handleInputChange} maxLength={7} autoComplete="off" spellCheck="false" />
              </div>
              <div className="modal-group">
                <label>Time Taken (in milliseconds)</label>
                <input required type="number" name="timeTaken" value={formData.timeTaken} onChange={handleInputChange} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-save">{editingRecord ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content modal-content-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#ff4d4f' }}>Confirm Deletion</h3>
            <p className="modal-text">
              Are you sure you want to delete this record?
            </p>
            <div className="modal-actions modal-actions-center">
              <button type="button" className="btn-cancel" onClick={handleCancelDelete}>Cancel</button>
              <button type="button" className="btn-delete-confirm" onClick={handleConfirmDelete}>Delete Record</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPage;