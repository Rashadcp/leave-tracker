import React from 'react';
import { Calendar, Clock, Plus } from 'lucide-react';
import { formatDate, formatDateRange } from '../utils/dateUtils';

export const HomeTab = ({ dashboardData, onNavigateApply, onSelectRequest }) => {
  if (!dashboardData) return null;

  const { user, summary, recentRequests } = dashboardData;

  const combinedRecent = [
    ...(recentRequests?.leaves || []).map(r => ({ ...r, reqType: 'leave' })),
    ...(recentRequests?.lates || []).map(r => ({ ...r, reqType: 'late' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

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
      {/* User Greeting & Fast Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {user?.name}
          </h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {user?.designation} • {user?.department}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigateApply('late')}
          >
            <Clock size={15} />
            Late
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigateApply('half')}
          >
            Half Day
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigateApply('full')}
          >
            <Plus size={15} />
            Full Day
          </button>
        </div>
      </div>

      {/* Just 2 Essential Balance Cards: Leave & Late */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {/* Leave Balance */}
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Leave Balance</span>
            <Calendar size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.totalRemainingDays?.toFixed(1) || '0.0'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>days left</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Total: {summary?.totalAllottedDays || 0}d • Taken: {summary?.totalTakenDays || 0}d
          </div>
        </div>

        {/* Late Allowance */}
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Late Coming Allowed</span>
            <Clock size={16} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.lateRemainingHours?.toFixed(1) || '0.0'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>hours left</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {summary?.lateRemainingCount || 0} times left this month
          </div>
        </div>
      </div>

      {/* Recent Requests List */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Recent Requests</h2>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateApply('history')}
          >
            All Requests
          </button>
        </div>

        {combinedRecent.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            No requests yet.
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-only">
              <div className="table-container">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Date / Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedRecent.map((item) => (
                      <tr 
                        key={item._id} 
                        onClick={() => onSelectRequest(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 600 }}>
                          {item.reqType === 'leave' ? (item.leaveTypeId?.name || 'Leave') : 'Late Coming'}
                        </td>
                        <td>
                          {item.reqType === 'leave' ? (
                            formatDateRange(item.startDate, item.endDate)
                          ) : (
                            `${formatDate(item.date)} (${item.expectedTime})`
                          )}
                        </td>
                        <td>
                          {item.reqType === 'leave' ? `${item.totalDays}d` : `+${item.lateMinutes}m`}
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards (Zero Horizontal Scrolling) */}
            <div className="mobile-only">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {combinedRecent.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => onSelectRequest(item)}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      gap: '10px'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {item.reqType === 'leave' ? (item.leaveTypeId?.name || 'Leave') : 'Late Coming'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.reqType === 'leave'
                          ? formatDateRange(item.startDate, item.endDate)
                          : `${formatDate(item.date)} (${item.expectedTime})`} • {item.reqType === 'leave' ? `${item.totalDays}d` : `+${item.lateMinutes}m`}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {getStatusBadge(item.status)}
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
