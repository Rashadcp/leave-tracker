import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { formatDate, formatDateRange } from '../utils/dateUtils';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const ApprovalsTab = ({ currentUser, onActionSuccess }) => {
  const [pendingData, setPendingData] = useState({ leaves: [], lates: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'leave' | 'late'

  const isHRAdmin = currentUser?.role === 'admin';

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getPendingApprovals();
      setPendingData(data);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?._id]);

  const handleDecision = async (id, requestType, action) => {
    setProcessingId(id);
    try {
      const res = await api.submitDecision(id, {
        requestType,
        action,
        approverId: currentUser._id,
        comment: action === 'approved' ? 'Approved' : 'Rejected'
      });
      onActionSuccess?.(res.message);
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPendingActionItems = pendingData.totalCount || 0;

  const showLeaves = filter === 'all' || filter === 'leave';
  const showLates = filter === 'all' || filter === 'late';

  const leavesToRender = showLeaves ? pendingData.leaves : [];
  const latesToRender = showLates ? pendingData.lates : [];
  const totalShown = leavesToRender.length + latesToRender.length;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Simple Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Approvals
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            {totalPendingActionItems === 0
              ? 'No pending requests right now'
              : `${totalPendingActionItems} pending requests`}
          </p>
        </div>

        {totalPendingActionItems > 0 && (
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 700,
            background: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FEE2E2',
            padding: '3px 10px',
            borderRadius: '999px',
            whiteSpace: 'nowrap'
          }}>
            {totalPendingActionItems} Pending
          </span>
        )}
      </div>

      {/* Filter Tabs (when both types or items exist) */}
      {totalPendingActionItems > 1 && (pendingData.leaves.length > 0 && pendingData.lates.length > 0) && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: filter === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: filter === 'all' ? 'var(--primary)' : '#FFFFFF',
              color: filter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            All ({totalPendingActionItems})
          </button>
          <button
            type="button"
            onClick={() => setFilter('leave')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: filter === 'leave' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: filter === 'leave' ? 'var(--primary)' : '#FFFFFF',
              color: filter === 'leave' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Leave ({pendingData.leaves.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('late')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: filter === 'late' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: filter === 'late' ? 'var(--primary)' : '#FFFFFF',
              color: filter === 'late' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Late ({pendingData.lates.length})
          </button>
        </div>
      )}

      {loading ? (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.86rem'
        }}>
          Loading...
        </div>
      ) : totalPendingActionItems === 0 ? (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '48px 20px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <CheckCircle size={24} />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            No Pending Requests
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            You have no pending requests right now.
          </p>
        </div>
      ) : totalShown === 0 ? (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '32px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.84rem'
        }}>
          No requests here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Leave Requests */}
          {leavesToRender.map(req => {
            const isHalfDay = req.isHalfDay;
            const periodLabel = isHalfDay
              ? `Half Day (${req.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})`
              : `${req.totalDays} day${req.totalDays > 1 ? 's' : ''}`;
            const dateDisplay = isHalfDay
              ? formatDate(req.startDate)
              : formatDateRange(req.startDate, req.endDate);

            return (
              <div
                key={req._id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header: User & Category */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#111827',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getInitials(req.userId?.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                        {req.userId?.name || 'Staff Member'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {req.userId?.department || 'Department'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    whiteSpace: 'nowrap'
                  }}>
                    {req.leaveTypeId?.name || 'Leave'}
                  </span>
                </div>

                {/* Schedule Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-subtle)',
                  padding: '8px 12px',
                  borderRadius: '8px'
                }}>
                  <Calendar size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <strong>{dateDisplay}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                      • {periodLabel}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                {req.reason && (
                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                    padding: '0 2px'
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Reason: </span>
                    {req.reason}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  paddingTop: '4px'
                }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      padding: '8px 12px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      borderRadius: '8px'
                    }}
                    disabled={processingId === req._id}
                    onClick={() => handleDecision(req._id, 'leave', 'rejected')}
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    className="btn"
                    style={{
                      background: '#059669',
                      border: '1px solid #059669',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      borderRadius: '8px'
                    }}
                    disabled={processingId === req._id}
                    onClick={() => handleDecision(req._id, 'leave', 'approved')}
                  >
                    <Check size={15} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Late Arrival Requests */}
          {latesToRender.map(req => (
            <div
              key={req._id}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Header: User & Late Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    color: '#D97706',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getInitials(req.userId?.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                      {req.userId?.name || 'Staff Member'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {req.userId?.department || 'Department'}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#FEF3C7',
                  color: '#B45309',
                  border: '1px solid #FDE68A',
                  whiteSpace: 'nowrap'
                }}>
                  Late Coming
                </span>
              </div>

              {/* Schedule Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                background: '#FFFBEB',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #FEF3C7'
              }}>
                <Clock size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <strong>{formatDate(req.date)}</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    • Arrives at <strong>{req.expectedTime}</strong>
                  </span>
                  <span style={{ color: '#D97706', fontWeight: 600, marginLeft: '6px' }}>
                    ({req.lateMinutes} mins late)
                  </span>
                </div>
              </div>

              {/* Reason */}
              {req.reason && (
                <div style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  padding: '0 2px'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Reason: </span>
                  {req.reason}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                paddingTop: '4px'
              }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '8px 12px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    borderRadius: '8px'
                  }}
                  disabled={processingId === req._id}
                  onClick={() => handleDecision(req._id, 'late', 'rejected')}
                >
                  <X size={15} />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    background: '#059669',
                    border: '1px solid #059669',
                    color: '#FFFFFF',
                    padding: '8px 12px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    borderRadius: '8px'
                  }}
                  disabled={processingId === req._id}
                  onClick={() => handleDecision(req._id, 'late', 'approved')}
                >
                  <Check size={15} />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
