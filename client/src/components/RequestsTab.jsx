import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatDate, formatDateRange } from '../utils/dateUtils';

export const RequestsTab = ({ currentUser, onSelectRequest }) => {
  const [filterType, setFilterType] = useState('all');
  const [requests, setRequests] = useState({ leaves: [], lates: [] });
  const [loading, setLoading] = useState(true);

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getMyRequests(currentUser._id, filterType);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser._id, filterType]);

  const handleCancel = async (id, type) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await api.cancelRequest(id, type, currentUser._id);
      fetchRequests(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const combined = [
    ...(requests.leaves || []).map(r => ({ ...r, reqType: 'leave' })),
    ...(requests.lates || []).map(r => ({ ...r, reqType: 'late' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge status-approved">Approved</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">Rejected</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">Cancelled</span>;
      default:
        return <span className="status-badge status-pending">Pending</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Requests</h1>
        <div className="tabs-group">
          <button 
            className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button 
            className={`tab-btn ${filterType === 'leave' ? 'active' : ''}`}
            onClick={() => setFilterType('leave')}
          >
            Leave
          </button>
          <button 
            className={`tab-btn ${filterType === 'late' ? 'active' : ''}`}
            onClick={() => setFilterType('late')}
          >
            Late
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading...
          </p>
        ) : combined.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No requests found.
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-only">
              <div className="table-container" style={{ border: 'none' }}>
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combined.map(item => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 600 }}>
                          {item.reqType === 'leave' ? (item.leaveTypeId?.name || 'Leave') : 'Late Coming'}
                        </td>
                        <td>
                          {item.reqType === 'leave' ? (
                            formatDateRange(item.startDate, item.endDate, '-')
                          ) : (
                            `${formatDate(item.date)} (${item.expectedTime})`
                          )}
                        </td>
                        <td>
                          {item.reqType === 'leave' ? (
                            item.isHalfDay ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>0.5d</span>
                                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {item.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'}
                                </span>
                              </div>
                            ) : (
                              `${item.totalDays}d`
                            )
                          ) : (
                            `+${item.lateMinutes}m`
                          )}
                        </td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.reason}
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {item.status === 'pending' ? (
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleCancel(item._id, item.reqType)}
                            >
                              Cancel
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => onSelectRequest(item)}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards (Zero Horizontal Scrolling) */}
            <div className="mobile-only">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {combined.map(item => (
                  <div
                    key={item._id}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {item.reqType === 'leave' ? (item.leaveTypeId?.name || 'Leave') : 'Late Coming'}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>
                        {item.reqType === 'leave'
                          ? formatDateRange(item.startDate, item.endDate, '-')
                          : `${formatDate(item.date)} (${item.expectedTime})`}
                      </strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                        • {item.reqType === 'leave' ? (item.isHalfDay ? `0.5d (${item.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})` : `${item.totalDays}d`) : `+${item.lateMinutes}m`}
                      </span>
                    </div>

                    {item.reason && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        "{item.reason}"
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      {item.status === 'pending' ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: '#FECACA' }}
                          onClick={() => handleCancel(item._id, item.reqType)}
                        >
                          Cancel Request
                        </button>
                      ) : (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectRequest(item)}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
