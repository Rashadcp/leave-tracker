import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Clock, Calendar } from 'lucide-react';
import { formatDate, formatDateRange } from '../utils/dateUtils';

const DEPARTMENTS = [
  'All',
  'Developer',
  'Sales',
  'Designers',
  'Digital Marketing Executive',
  'Finance'
];

export const TrackingTab = ({ currentUser }) => {
  const [subTab, setSubTab] = useState('late'); // 'late' | 'leave'
  const [trackingData, setTrackingData] = useState(null);
  const [consumptionData, setConsumptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (dept = selectedDept, search = searchQuery) => {
    setLoading(true);
    try {
      const params = { department: dept, search };
      const [trackRes, consRes] = await Promise.all([
        api.getAdminTracking(params),
        api.getAdminConsumption(params)
      ]);
      setTrackingData(trackRes);
      setConsumptionData(consRes);
    } catch (err) {
      console.error('Error loading tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(selectedDept, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedDept, searchQuery]);

  // Exclude admin accounts from staff attendance reports (matching is done server-side)
  const filteredReports = (consumptionData?.report || []).filter(item => item.user.role !== 'admin');
  const filteredLateLogs = trackingData?.lates || [];
  const filteredLeaveLogs = trackingData?.leaves || [];

  // Summary calculations for quick HR tracking insights
  const overQuotaStaffCount = filteredReports.filter(r => r.isOverQuota || r.extraDays > 0 || (r.totalTaken > r.totalAllotted)).length;
  const pendingLeavesCount = filteredReports.reduce((acc, r) => acc + (r.pendingLeaves || 0), 0);
  const lateExceededStaffCount = filteredReports.filter(item => {
    const late = item.lateAlloc || {};
    return (late.usedHours > late.allottedHours) || (late.usedCount > late.allottedCount);
  }).length;
  const pendingLatesCount = filteredReports.reduce((acc, r) => acc + (r.pendingLates || 0), 0);

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Staff Attendance
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            View late coming and leave records for all staff
          </p>
        </div>

        {/* View Switcher: Late vs Leave */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <button
            className="btn btn-sm"
            style={{
              background: subTab === 'late' ? '#FFFFFF' : 'transparent',
              color: subTab === 'late' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: subTab === 'late' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              fontWeight: subTab === 'late' ? 600 : 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setSubTab('late')}
          >
            <Clock size={14} />
            <span>Late Coming</span>
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: subTab === 'leave' ? '#FFFFFF' : 'transparent',
              color: subTab === 'leave' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: subTab === 'leave' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              fontWeight: subTab === 'leave' ? 600 : 500,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setSubTab('leave')}
          >
            <Calendar size={14} />
            <span>Leaves</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards across mobile */}
      {subTab === 'late' ? (
        <>
          <div className="kpi-grid-3">
            <div className="kpi-card">
              <span className="kpi-label">Times Late</span>
              <div className="kpi-value">
                {trackingData?.summary?.totalLateIncidents ?? 0}
              </div>
              <span className="kpi-subtext">This month</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Late Hours</span>
              <div className="kpi-value" style={{ color: 'var(--warning)' }}>
                {trackingData?.summary?.totalLateHours ?? '0.0'}h
              </div>
              <span className="kpi-subtext">Total time</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Staff</span>
              <div className="kpi-value">
                {trackingData?.summary?.activeStaffCount ?? filteredReports.length}
              </div>
              <span className="kpi-subtext">Active staff</span>
            </div>
          </div>

          {lateExceededStaffCount > 0 && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: '8px',
              color: 'var(--danger)',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠️ {lateExceededStaffCount} staff member{lateExceededStaffCount > 1 ? 's' : ''} exceeded late policy limits</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="kpi-grid-3">
            <div className="kpi-card">
              <span className="kpi-label">Days Taken</span>
              <div className="kpi-value">
                {trackingData?.summary?.totalLeavesTaken ?? 0}d
              </div>
              <span className="kpi-subtext">This month</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Pending</span>
              <div className="kpi-value" style={{ color: pendingLeavesCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {pendingLeavesCount}
              </div>
              <span className="kpi-subtext">Requests</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Staff</span>
              <div className="kpi-value">
                {trackingData?.summary?.activeStaffCount ?? filteredReports.length}
              </div>
              <span className="kpi-subtext">Active staff</span>
            </div>
          </div>

          {overQuotaStaffCount > 0 && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: '8px',
              color: 'var(--danger)',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠️ {overQuotaStaffCount} staff member{overQuotaStaffCount > 1 ? 's' : ''} exceeded monthly leave quota</span>
            </div>
          )}
        </>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '16px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Department Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className="btn btn-sm"
                style={{
                  background: selectedDept === dept ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: selectedDept === dept ? '#FFFFFF' : 'var(--text-secondary)',
                  border: selectedDept === dept ? '1px solid var(--primary)' : '1px solid var(--border)',
                  fontSize: '0.76rem',
                  padding: '4px 9px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap'
                }}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
            <input
              type="text"
              placeholder="Search staff name or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ fontSize: '0.82rem', padding: '6px 10px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* SUBTAB 1: LATE TRACKING CONTENT */}
      {subTab === 'late' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Employee Late Records */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Employee Late Records (This Month)
              </h2>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Limit: {trackingData?.policy?.lateHours ?? 3} hrs / {trackingData?.policy?.lateCount ?? 3} times per month
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Loading...
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No staff members registered yet</p>
                <p>When employees sign up and are approved, their monthly late records and limits will show here.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <div className="table-container">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Allowed Hours</th>
                          <th style={{ textAlign: 'center' }}>Hours Late</th>
                          <th style={{ textAlign: 'center' }}>Hours Left</th>
                          <th style={{ textAlign: 'center' }}>Times Late</th>
                          <th style={{ textAlign: 'center' }}>Pending</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map(item => {
                          const late = item.lateAlloc || { allottedHours: 3, usedHours: 0, remainingHours: 3, allottedCount: 3, usedCount: 0 };
                          const isExceeded = late.usedHours > late.allottedHours || late.usedCount > late.allottedCount;
                          const hasLates = late.usedHours > 0;

                          return (
                            <tr key={item.user._id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{item.user.name}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {item.user.department}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 500 }}>
                                {late.allottedHours}h
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: hasLates ? 'var(--warning)' : 'var(--text-muted)' }}>
                                {late.usedHours}h
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: late.remainingHours <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                                {late.remainingHours}h
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                  {late.usedCount}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  /{late.allottedCount}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {item.pendingLates > 0 ? (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    background: 'var(--warning-subtle)',
                                    color: 'var(--warning)',
                                    border: '1px solid var(--warning-border)'
                                  }}>
                                    {item.pendingLates} pending
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isExceeded ? (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--danger)',
                                    background: 'var(--danger-subtle)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    Exceeded Limit
                                  </span>
                                ) : hasLates ? (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--warning)',
                                    background: 'var(--warning-subtle)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    Late
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--success)',
                                    background: 'var(--success-subtle)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    On Time
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards (Zero Horizontal Scroll) */}
                <div className="mobile-only">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredReports.map(item => {
                      const late = item.lateAlloc || { allottedHours: 3, usedHours: 0, remainingHours: 3, allottedCount: 3, usedCount: 0 };
                      const isExceeded = late.usedHours > late.allottedHours || late.usedCount > late.allottedCount;
                      const hasLates = late.usedHours > 0;

                      return (
                        <div key={item.user._id} className="mobile-card-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {item.user.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {item.user.department}
                              </div>
                            </div>
                            <div>
                              {isExceeded ? (
                                <span className="status-badge status-rejected" style={{ fontWeight: 700 }}>
                                  Exceeded Limit
                                </span>
                              ) : hasLates ? (
                                <span className="status-badge status-pending">
                                  Late ({late.usedHours}h)
                                </span>
                              ) : (
                                <span className="status-badge status-approved">
                                  On Time
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '6px',
                            background: 'var(--bg-subtle)',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            textAlign: 'center',
                            fontSize: '0.72rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Allowed</span>
                              <strong>{late.allottedHours}h</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Used</span>
                              <strong style={{ color: hasLates ? 'var(--warning)' : 'inherit' }}>{late.usedHours}h</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Left</span>
                              <strong style={{ color: late.remainingHours <= 0 ? 'var(--danger)' : 'var(--success)' }}>{late.remainingHours}h</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Times</span>
                              <strong>{late.usedCount}/{late.allottedCount}</strong>
                            </div>
                          </div>

                          {item.pendingLates > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
                              ⏳ {item.pendingLates} pending late report{item.pendingLates > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Organization Late Activity History Log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Late Coming History ({filteredLateLogs.length})
              </h2>
            </div>

            {filteredLateLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No late records found.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <div className="table-container">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Arrived At</th>
                          <th>Minutes Late</th>
                          <th>Reason</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLateLogs.map(log => (
                          <tr key={log._id}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formatDate(log.date)}
                            </td>
                            <td>
                              <strong>{log.userId?.name || 'Staff'}</strong>
                            </td>
                            <td>{log.userId?.department || '-'}</td>
                            <td>{log.expectedTime}</td>
                            <td style={{ fontWeight: 600, color: 'var(--warning)' }}>
                              +{log.lateMinutes} mins
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                              "{log.reason}"
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={`status-badge status-${log.status}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards (Zero Horizontal Scroll) */}
                <div className="mobile-only">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredLateLogs.map(log => (
                      <div key={log._id} className="mobile-card-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                            {log.userId?.name || 'Staff'}
                          </span>
                          <span className={`status-badge status-${log.status}`}>
                            {log.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(log.date)} • {log.expectedTime} • <span style={{ color: 'var(--warning)', fontWeight: 700 }}>+{log.lateMinutes}m late</span>
                        </div>
                        {log.reason && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            "{log.reason}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: LEAVE TRACKING CONTENT */}
      {subTab === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Employee Leave Balances Matrix */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Employee Leave Balances
              </h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Loading...
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No staff members registered yet</p>
                <p>When employees sign up and are approved, their allocated leave limits and balances will show here.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <div className="table-container">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Allowed Days</th>
                          <th style={{ textAlign: 'center' }}>Days Taken</th>
                          <th style={{ textAlign: 'center' }}>Days Left</th>
                          <th style={{ textAlign: 'center' }}>Pending</th>
                          <th style={{ textAlign: 'center' }}>Used %</th>
                          <th style={{ textAlign: 'right' }}>Quota Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map(item => {
                          const extraDays = item.extraDays || Math.max(0, (item.totalTaken || 0) - (item.totalAllotted || 0));
                          const isOver = item.isOverQuota || extraDays > 0;

                          return (
                            <tr key={item.user._id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{item.user.name}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {item.user.department}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                {item.totalAllotted}d
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: item.totalTaken > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {item.totalTaken}d
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: item.totalRemaining <= 0 ? (isOver ? 'var(--danger)' : 'var(--warning)') : 'var(--success)' }}>
                                {item.totalRemaining}d
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {item.pendingLeaves > 0 ? (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    background: 'var(--warning-subtle)',
                                    color: 'var(--warning)',
                                    border: '1px solid var(--warning-border)'
                                  }}>
                                    {item.pendingLeaves} pending
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: item.utilizationPct > 100 ? 'var(--danger-subtle)' : item.utilizationPct >= 80 ? 'var(--warning-subtle)' : 'var(--bg-subtle)',
                                  color: item.utilizationPct > 100 ? 'var(--danger)' : item.utilizationPct >= 80 ? 'var(--warning)' : 'var(--text-primary)'
                                }}>
                                  {item.utilizationPct}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isOver ? (
                                  <span className="status-badge status-rejected" style={{ fontWeight: 700 }}>
                                    +{extraDays}d Over Quota
                                  </span>
                                ) : item.totalRemaining === 0 && item.totalTaken > 0 ? (
                                  <span className="status-badge status-pending" style={{ fontWeight: 600 }}>
                                    Quota Exhausted
                                  </span>
                                ) : item.totalTaken > 0 ? (
                                  <span className="status-badge status-approved" style={{ fontWeight: 600 }}>
                                    Within Quota
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Available
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards (Zero Horizontal Scroll) */}
                <div className="mobile-only">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredReports.map(item => {
                      const extraDays = item.extraDays || Math.max(0, (item.totalTaken || 0) - (item.totalAllotted || 0));
                      const isOver = item.isOverQuota || extraDays > 0;

                      return (
                        <div key={item.user._id} className="mobile-card-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {item.user.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {item.user.department}
                              </div>
                            </div>
                            <div>
                              {isOver ? (
                                <span className="status-badge status-rejected" style={{ fontWeight: 700 }}>
                                  +{extraDays}d Over Quota
                                </span>
                              ) : item.totalRemaining === 0 && item.totalTaken > 0 ? (
                                <span className="status-badge status-pending" style={{ fontWeight: 600 }}>
                                  Quota Exhausted
                                </span>
                              ) : item.totalTaken > 0 ? (
                                <span className="status-badge status-approved" style={{ fontWeight: 600 }}>
                                  Within Quota
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Available
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '6px',
                            background: 'var(--bg-subtle)',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            textAlign: 'center',
                            fontSize: '0.72rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Allowed</span>
                              <strong>{item.totalAllotted}d</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Taken</span>
                              <strong style={{ color: item.totalTaken > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.totalTaken}d</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Left</span>
                              <strong style={{ color: item.totalRemaining <= 0 ? (isOver ? 'var(--danger)' : 'var(--warning)') : 'var(--success)' }}>{item.totalRemaining}d</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.64rem', textTransform: 'uppercase' }}>Used</span>
                              <strong>{item.utilizationPct}%</strong>
                            </div>
                          </div>

                          {item.pendingLeaves > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
                              ⏳ {item.pendingLeaves} pending leave request{item.pendingLeaves > 1 ? 's' : ''} awaiting approval
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Organization Leave Applications Log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Leave History ({filteredLeaveLogs.length})
              </h2>
            </div>

            {filteredLeaveLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No leave requests found.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-only">
                  <div className="table-container">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Dates</th>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Leave Type</th>
                          <th>Duration</th>
                          <th>Reason</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaveLogs.map(log => (
                          <tr key={log._id}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formatDateRange(log.startDate, log.endDate)}
                            </td>
                            <td>
                              <strong>{log.userId?.name || 'Staff'}</strong>
                            </td>
                            <td>{log.userId?.department || '-'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--primary-subtle)',
                                color: 'var(--primary)'
                              }}>
                                {log.leaveTypeId?.name || 'Leave'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {log.isHalfDay ? (
                                <span>
                                  0.5d <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({log.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})</span>
                                </span>
                              ) : (
                                `${log.totalDays} day${log.totalDays > 1 ? 's' : ''}`
                              )}
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '220px' }}>
                              "{log.reason}"
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={`status-badge status-${log.status}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards (Zero Horizontal Scroll) */}
                <div className="mobile-only">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredLeaveLogs.map(log => (
                      <div key={log._id} className="mobile-card-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                              {log.userId?.name || 'Staff'}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              {log.userId?.department}
                            </span>
                          </div>
                          <span className={`status-badge status-${log.status}`}>
                            {log.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatDateRange(log.startDate, log.endDate)}</strong> • {log.isHalfDay ? 'Half Day (0.5d)' : `${log.totalDays}d`} • {log.leaveTypeId?.name || 'Leave'}
                        </div>

                        {log.reason && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            "{log.reason}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
