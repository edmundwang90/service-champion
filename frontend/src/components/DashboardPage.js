import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();

  // Dashboard Data State
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [searchQuery, setSearchQuery] = useState(''); 
  
  // Date Filter States
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [activeCalendar, setActiveCalendar] = useState(null);

  // Multiple Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Graph Modal Overlay State & Active Graph Tab
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState('scatter');

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

  // --- DYNAMIC EMAIL NAME EXTRACTION FOR GREETING ---
  const adminGreetingName = useMemo(() => {
    // Retrieves the signed-in email or username from session/local storage
    const storedValue = 
      sessionStorage.getItem('email') || 
      sessionStorage.getItem('user') || 
      sessionStorage.getItem('admin_email') || 
      sessionStorage.getItem('admin_user') || 
      localStorage.getItem('email') || 
      localStorage.getItem('user') || 
      localStorage.getItem('admin_email') ||
      'edmund.wang@cathaypacific.com'; // Fallback if no storage found yet

    // If it's an email address, extract the prefix before '@'
    const namePart = storedValue.includes('@') ? storedValue.split('@')[0] : storedValue;
    
    // Split by underscores, dots, hyphens, or spaces to grab the first token/syllable
    const firstToken = namePart.split(/[\._\s-]/)[0];
    
    if (!firstToken) return 'User';
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
  }, []);

  useEffect(() => {
    document.title = 'Admin Dashboard';
    fetchRecords();

    const socket = io(apiUrl);
    socket.on('leaderboardUpdated', (updatedRecords) => {
      setRecords(updatedRecords);
    });

    return () => socket.disconnect();
  }, [apiUrl]);

  // Close calendar dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-date-picker-wrapper') && !e.target.closest('.calendar-popup-dropdown')) {
        setActiveCalendar(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate('/login');
  };

  // --- MULTIPLE SELECTION HANDLERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedRecords.map(record => record._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBatchDeleteClick = () => {
    if (selectedIds.length > 0) setIsBatchDeleteModalOpen(true);
  };

  const handleConfirmBatchDelete = async () => {
    try {
      await axios.post(`${apiUrl}/api/records/batch-delete`, { ids: selectedIds });
      fetchRecords();
      setSelectedIds([]); 
      setIsBatchDeleteModalOpen(false);
    } catch (error) {
      console.error("Error batch deleting records:", error);
      alert("Failed to delete selected records.");
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

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await axios.delete(`${apiUrl}/api/records/${recordToDelete}`);
      fetchRecords(); 
      setSelectedIds(prev => prev.filter(item => item !== recordToDelete));
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
      processedRecords = processedRecords.filter(record => 
        record.badgeName?.toUpperCase().includes(upperQuery) ||
        record.employeeId?.toUpperCase().includes(upperQuery) ||
        record.galaxyId?.toUpperCase().includes(upperQuery)
      );
    }

    if (startDateFilter || endDateFilter) {
      processedRecords = processedRecords.filter(record => {
        const recordDate = new Date(record.updatedAt || record.createdAt || record.date);
        if (isNaN(recordDate.getTime())) return false;

        let isAfterStart = true;
        let isBeforeEnd = true;

        if (startDateFilter) {
          const start = new Date(startDateFilter);
          start.setHours(0, 0, 0, 0); 
          isAfterStart = recordDate.getTime() >= start.getTime();
        }

        if (endDateFilter) {
          const end = new Date(endDateFilter);
          end.setHours(23, 59, 59, 999); 
          isBeforeEnd = recordDate.getTime() <= end.getTime();
        }

        return isAfterStart && isBeforeEnd;
      });
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
  }, [records, sortConfig, searchQuery, startDateFilter, endDateFilter]);

  // --- GRAPH DATA GENERATORS ---
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

  const histogramData = useMemo(() => {
    const buckets = {
      '0-30s': 0,
      '31-60s': 0,
      '61-90s': 0,
      '91-120s': 0,
      '120s+': 0
    };

    filteredAndSortedRecords.forEach(record => {
      const seconds = record.timeTaken / 1000;
      if (seconds <= 30) buckets['0-30s']++;
      else if (seconds <= 60) buckets['31-60s']++;
      else if (seconds <= 90) buckets['61-90s']++;
      else if (seconds <= 120) buckets['91-120s']++;
      else buckets['120s+']++;
    });

    return Object.keys(buckets).map(range => ({
      range,
      count: buckets[range]
    }));
  }, [filteredAndSortedRecords]);

  const dailyVolumeData = useMemo(() => {
    const dateCounts = {};

    filteredAndSortedRecords.forEach(record => {
      const recordDate = new Date(record.updatedAt || record.createdAt || record.date);
      if (!isNaN(recordDate.getTime())) {
        const dateStr = recordDate.toLocaleDateString();
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });

    return Object.keys(dateCounts)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => ({
        date,
        submissions: dateCounts[date]
      }));
  }, [filteredAndSortedRecords]);

  const cumulativeData = useMemo(() => {
    const dateCounts = {};

    filteredAndSortedRecords.forEach(record => {
      const recordDate = new Date(record.updatedAt || record.createdAt || record.date);
      if (!isNaN(recordDate.getTime())) {
        const dateStr = recordDate.toLocaleDateString();
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));
    let runningTotal = 0;

    return sortedDates.map(date => {
      runningTotal += dateCounts[date];
      return {
        date,
        totalParticipants: runningTotal
      };
    });
  }, [filteredAndSortedRecords]);

  const timeOfDayData = useMemo(() => {
    const hours = {
      '00:00 - 04:00 (Night)': 0,
      '04:00 - 08:00 (Early Morning)': 0,
      '08:00 - 12:00 (Morning)': 0,
      '12:00 - 16:00 (Afternoon)': 0,
      '16:00 - 20:00 (Evening)': 0,
      '20:00 - 24:00 (Night)': 0
    };

    filteredAndSortedRecords.forEach(record => {
      const recordDate = new Date(record.updatedAt || record.createdAt || record.date);
      if (!isNaN(recordDate.getTime())) {
        const hr = recordDate.getHours();
        if (hr >= 0 && hr < 4) hours['00:00 - 04:00 (Night)']++;
        else if (hr >= 4 && hr < 8) hours['04:00 - 08:00 (Early Morning)']++;
        else if (hr >= 8 && hr < 12) hours['08:00 - 12:00 (Morning)']++;
        else if (hr >= 12 && hr < 16) hours['12:00 - 16:00 (Afternoon)']++;
        else if (hr >= 16 && hr < 20) hours['16:00 - 20:00 (Evening)']++;
        else hours['20:00 - 24:00 (Night)']++;
      }
    });

    return Object.keys(hours).map(slot => ({
      timeSlot: slot,
      submissions: hours[slot]
    }));
  }, [filteredAndSortedRecords]);

  const formatTimeTaken = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }; 

  const getExcelDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getExcelTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Records');

    const fileName = `Filtered_Campaign_Records_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        
        {/* WELCOME GREETING HEADER */}
        <div className="dashboard-welcome-banner">
          <h1 className="dashboard-welcome-title">Hello, {adminGreetingName}! 😜</h1>
        </div>

        <div className="dashboard-header">
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
            <div className="search-container" style={{ flex: '1', minWidth: '220px', maxWidth: '300px', margin: 0 }}>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search Name, ERN, ID" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              />
            </div>
            
            {/* CUSTOM CALENDAR POPUPS (BOTH START AND END ALWAYS VISIBLE) */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
              
              {/* Start Date Button */}
              <div 
                className="custom-date-picker-wrapper" 
                onClick={() => setActiveCalendar(activeCalendar === 'start' ? null : 'start')}
              >
                <span className="date-picker-label-text">{startDateFilter ? startDateFilter : 'Start Date'}</span>
              </div>

              {/* Start Date Popup Modal */}
              {activeCalendar === 'start' && (
                <div className="calendar-popup-dropdown" onClick={(e) => e.stopPropagation()}>
                  <Calendar 
                    onChange={(date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const formatted = `${year}-${month}-${day}`;
                      
                      setStartDateFilter(formatted);
                      
                      if (endDateFilter && formatted > endDateFilter) {
                        setEndDateFilter('');
                      }
                      
                      setActiveCalendar(null);
                    }}
                    value={startDateFilter ? new Date(startDateFilter) : new Date()}
                  />
                </div>
              )}

              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600 }}>to</span>

              {/* End Date Button */}
              <div 
                className="custom-date-picker-wrapper" 
                onClick={() => setActiveCalendar(activeCalendar === 'end' ? null : 'end')}
              >
                <span className="date-picker-label-text">{endDateFilter ? endDateFilter : 'End Date'}</span>
              </div>

              {/* End Date Popup Modal */}
              {activeCalendar === 'end' && (
                <div className="calendar-popup-dropdown" onClick={(e) => e.stopPropagation()}>
                  <Calendar 
                    onChange={(date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setEndDateFilter(`${year}-${month}-${day}`);
                      setActiveCalendar(null);
                    }}
                    value={endDateFilter ? new Date(endDateFilter) : (startDateFilter ? new Date(startDateFilter) : new Date())}
                    minDate={startDateFilter ? new Date(startDateFilter) : undefined}
                  />
                </div>
              )}

              {(startDateFilter || endDateFilter) && (
                <button 
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setActiveCalendar(null); }}
                  style={{
                    background: 'rgba(255, 77, 79, 0.15)',
                    color: '#ff7875',
                    border: '1px solid rgba(255, 77, 79, 0.3)',
                    borderRadius: '12px',
                    height: '48px',
                    padding: '0 14px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.target.style.background = 'rgba(255, 77, 79, 0.8)'; e.target.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(255, 77, 79, 0.15)'; e.target.style.color = '#ff7875'; }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="header-actions">
            {selectedIds.length > 0 && (
              <button className="btn-batch-delete" onClick={handleBatchDeleteClick}>
                Delete Selected ({selectedIds.length})
              </button>
            )}
            
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
              Analytics & Insights
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Log Out">
              Log Out
            </button>
          </div>
        </div>
        
        <div className="dashboard-table-container">
          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="checkbox-col-header">
                    <input 
                      type="checkbox" 
                      className="custom-checkbox"
                      onChange={handleSelectAll} 
                      checked={filteredAndSortedRecords.length > 0 && selectedIds.length === filteredAndSortedRecords.length}
                    />
                  </th>
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
                    Attempt Time <span className="sort-icon">{getSortIcon('time')}</span>
                  </th>
                  <th className="actions-col-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="empty-state">Loading database records... ⏳</td>
                  </tr>
                ) : filteredAndSortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      {searchQuery || startDateFilter || endDateFilter ? 'No records match your filters.' : 'No records found in the database.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRecords.map((record, index) => (
                    <tr key={record._id || index}>
                      <td className="checkbox-col">
                        <input 
                          type="checkbox" 
                          className="custom-checkbox"
                          checked={selectedIds.includes(record._id)}
                          onChange={(e) => handleSelectOne(e, record._id)}
                        />
                      </td>
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

      {isGraphModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGraphModalOpen(false)}>
          <div className="modal-content graph-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="graph-modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>Analytics & Insights</h3>
              <button className="graph-close-btn" onClick={() => setIsGraphModalOpen(false)}>✕</button>
            </div>

            <div className="graph-tab-container">
              <button 
                className={`graph-tab-btn ${activeGraphTab === 'scatter' ? 'active' : ''}`}
                onClick={() => setActiveGraphTab('scatter')}
              >
                Scatter
              </button>
              <button 
                className={`graph-tab-btn ${activeGraphTab === 'histogram' ? 'active' : ''}`}
                onClick={() => setActiveGraphTab('histogram')}
              >
                Distribution
              </button>
              <button 
                className={`graph-tab-btn ${activeGraphTab === 'volume' ? 'active' : ''}`}
                onClick={() => setActiveGraphTab('volume')}
              >
                Daily Volume
              </button>
              <button 
                className={`graph-tab-btn ${activeGraphTab === 'cumulative' ? 'active' : ''}`}
                onClick={() => setActiveGraphTab('cumulative')}
              >
                Growth Curve
              </button>
              <button 
                className={`graph-tab-btn ${activeGraphTab === 'timeofday' ? 'active' : ''}`}
                onClick={() => setActiveGraphTab('timeofday')}
              >
                Busy Periods
              </button>
            </div>
            
            <div style={{ width: '100%', height: '380px', marginTop: '10px' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255, 255, 255, 0.6)' }}>Loading chart visualization...</div>
              ) : activeGraphTab === 'scatter' ? (
                scatterPlotData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255, 255, 255, 0.6)' }}>No data available for plotting.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis type="number" dataKey="index" name="Entry" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                      <YAxis type="number" dataKey="timeInSeconds" name="Time" unit="s" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
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
                )
              ) : activeGraphTab === 'histogram' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="range" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Completion Time Brackets', position: 'insideBottom', offset: -10, fill: '#fff' }} />
                    <YAxis allowDecimals={false} stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Participant Count', angle: -90, position: 'insideLeft', fill: '#fff' }} />
                    <Tooltip 
                      contentStyle={{ background: '#002b2e', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => [`${value} participants`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#4ade80" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : activeGraphTab === 'volume' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyVolumeData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Submission Date', position: 'insideBottom', offset: -10, fill: '#fff' }} />
                    <YAxis allowDecimals={false} stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Total Submissions', angle: -90, position: 'insideLeft', fill: '#fff' }} />
                    <Tooltip 
                      contentStyle={{ background: '#002b2e', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => [`${value} submissions`, 'Volume']}
                    />
                    <Bar dataKey="submissions" fill="#fce18a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : activeGraphTab === 'cumulative' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#008f99" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#008f99" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Timeline', position: 'insideBottom', offset: -10, fill: '#fff' }} />
                    <YAxis allowDecimals={false} stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Cumulative Participants', angle: -90, position: 'insideLeft', fill: '#fff' }} />
                    <Tooltip 
                      contentStyle={{ background: '#002b2e', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => [`${value} total participants`, 'Cumulative Count']}
                    />
                    <Area type="monotone" dataKey="totalParticipants" stroke="#008f99" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDayData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="timeSlot" stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Time of Day (Busy Periods)', position: 'insideBottom', offset: -10, fill: '#fff' }} />
                    <YAxis allowDecimals={false} stroke="#ffffff" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} label={{ value: 'Submissions', angle: -90, position: 'insideLeft', fill: '#fff' }} />
                    <Tooltip 
                      contentStyle={{ background: '#002b2e', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => [`${value} submissions`, 'Activity']}
                    />
                    <Bar dataKey="submissions" fill="#f4306d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingRecord ? 'Edit Record' : 'Add New Record'}</h3>
            {errorMessage && <div className="error-message">{errorMessage}</div>}
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

      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content modal-content-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#ff4d4f' }}>Confirm Deletion</h3>
            <p className="modal-text">Are you sure you want to delete this record?</p>
            <div className="modal-actions modal-actions-center">
              <button type="button" className="btn-cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-delete-confirm" onClick={handleConfirmDelete}>Delete Record</button>
            </div>
          </div>
        </div>
      )}

      {isBatchDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBatchDeleteModalOpen(false)}>
          <div className="modal-content modal-content-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#ff4d4f' }}>Batch Deletion</h3>
            <p className="modal-text">
              Are you sure you want to delete the <strong>{selectedIds.length}</strong> selected records? This cannot be undone.
            </p>
            <div className="modal-actions modal-actions-center">
              <button type="button" className="btn-cancel" onClick={() => setIsBatchDeleteModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-delete-confirm" onClick={handleConfirmBatchDelete}>Delete All Selected</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPage;