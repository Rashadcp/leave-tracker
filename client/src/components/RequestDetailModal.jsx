import React from 'react';
import { X } from 'lucide-react';
import { formatDate, formatDateRange } from '../utils/dateUtils';

export const RequestDetailModal = ({ request, onClose }) => {
  if (!request) return null;

  const isLeave = request.reqType === 'leave';

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: 'var(--shadow-md)',
          padding: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              {isLeave ? (request.leaveTypeId?.name || 'Leave Request') : 'Late Coming Request'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status:</span>
            <span className="status-badge" style={{
              background: request.status === 'approved' ? 'var(--success-subtle)' : request.status === 'rejected' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
              color: request.status === 'approved' ? 'var(--success)' : request.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
            }}>
              {request.status}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem' }}>
            <strong style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Date &amp; Time
            </strong>
            <span style={{ color: 'var(--text-primary)' }}>
              {isLeave ? (
                request.isHalfDay 
                  ? `${formatDate(request.startDate)} (Half Day • ${request.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})`
                  : `${formatDateRange(request.startDate, request.endDate)} (${request.totalDays} day${request.totalDays > 1 ? 's' : ''})`
              ) : (
                `Date: ${formatDate(request.date)} • Arrived at ${request.expectedTime}`
              )}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem' }}>
            <strong style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Reason
            </strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              {request.reason}
            </p>
          </div>

          {request.attachmentName && (
            <div style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>
              Document: {request.attachmentName}
            </div>
          )}

          {request.approverComment && (
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong>Manager Note:</strong> {request.approverComment}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
