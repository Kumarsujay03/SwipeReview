import React, { useState, useEffect } from 'react';
import { sheetsService } from '../services/sheets';
import { X } from 'lucide-react';
import '../styles/History.css';

const History = ({ user }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await sheetsService.fetchHistory();
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        // Extract current status (Approved or Rejected)
        const currentStatus = item.status.includes('Approved') ? 'Approved' : 'Rejected';
        setNewStatus(currentStatus);
    };

    const handleStatusChange = async () => {
        if (!selectedItem || !newStatus) return;

        try {
            await sheetsService.updateRowStatus(selectedItem.id, newStatus, user, selectedItem.comments || '');
            // Reload history to show updated status
            await loadHistory();
            setSelectedItem(null);
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status. Please try again.");
        }
    };

    if (loading) return <div className="loading">Loading history...</div>;

    return (
        <div className="history-container">
            {history.length === 0 ? (
                <div className="empty-state">No history yet.</div>
            ) : (
                <div className="history-list">
                    {history.map(item => (
                        <div
                            key={item.id}
                            className={`history-item ${item.status.includes('Approved') ? 'approved' : 'rejected'}`}
                            onClick={() => handleItemClick(item)}
                        >
                            <div className="history-header">
                                <span className="status-badge">{item.status}</span>
                                <span className="date">{new Date(item.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h4 className="history-title">{item.title}</h4>
                            <p className="history-content">{item.content.substring(0, 100)}...</p>
                            {item.comments && (
                                <div className="history-comment">
                                    <strong>Comment:</strong> {item.comments}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedItem && (
                <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedItem.title}</h3>
                            <button className="close-btn" onClick={() => setSelectedItem(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="full-content">{selectedItem.content}</p>

                            <div className="status-section">
                                <label>Change Status:</label>
                                <div className="status-buttons">
                                    <button
                                        className={`status-btn approve ${newStatus === 'Approved' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Approved')}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className={`status-btn reject ${newStatus === 'Rejected' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Rejected')}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>

                            {selectedItem.comments && (
                                <div className="existing-comment">
                                    <strong>Existing Comment:</strong>
                                    <p>{selectedItem.comments}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setSelectedItem(null)}>Cancel</button>
                            <button className="primary" onClick={handleStatusChange}>
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
