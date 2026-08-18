import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Dashboard Data State
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [searchQuery, setSearchQuery] = useState(''); 

  // --- NEW: Multiple Selection State ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

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

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    navigate('/login');
  };

  // --- MULTIPLE SELECTION HANDLERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all currently filtered/visible records
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
      setSelectedIds([]); // Clear selection after successful delete
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
      // Remove from selected list if they deleted it individually while it was checked
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Records');

    const fileName = `Campaign_Records_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        
        <div className="dashboard-header">
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
            {/* NEW: Conditional Batch Delete Button */}
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
              View Graph
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
                  {/* NEW: Select All Checkbox Header */}
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
                    Last Updated <span className="sort-icon">{getSortIcon('time')}</span>
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
                      {searchQuery ? 'No records match your search criteria.' : 'No records found in the database.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRecords.map((record, index) => (
                    <tr key={record._id || index}>
                      {/* NEW: Individual Row Checkbox */}
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
                    />
                    <YAxis 
                      type="number" 
                      dataKey="timeInSeconds" 
                      name="Time" 
                      unit="s" 
                      stroke="#ffffff" 
                      tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
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

      {/* Delete Single Record Modal */}
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

      {/* NEW: Delete Multiple Records Modal */}
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