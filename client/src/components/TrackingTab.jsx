import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

let attendanceCache = null;

const Extra = ({ leave, late }) => {
  if (!leave && !late) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{leave ? `+${leave}d` : ''}{leave && late ? ' · ' : ''}{late ? `+${late} late` : ''}</span>;
};

export const TrackingTab = () => {
  const [consumptionData, setConsumptionData] = useState(attendanceCache);
  const [loading, setLoading] = useState(!attendanceCache);

  useEffect(() => {
    if (attendanceCache) return;
    api.getAdminConsumption()
      .then(consumption => { attendanceCache = consumption; setConsumptionData(consumption); })
      .catch(error => console.error('Error loading attendance:', error))
      .finally(() => setLoading(false));
  }, []);

  const employees = useMemo(() => (consumptionData?.report || []).filter(item => item.user.role !== 'admin').map(item => {
    const late = item.lateAlloc || {};
    const halfDays = item.approvedHalfDays || 0;
    const extraLeave = Math.max(0, Number(item.extraDays) || Number(item.totalTaken || 0) - Number(item.totalAllotted || 0));
    const extraLate = Math.max(0, Number(late.usedCount || 0) - Number(late.allottedCount || 0));
    return { ...item, late, halfDays, extraLeave, extraLate };
  }).sort((a, b) => (b.extraLeave + b.extraLate) - (a.extraLeave + a.extraLate) || a.user.name.localeCompare(b.user.name)), [consumptionData]);

  return <div style={{ maxWidth: '980px', margin: '0 auto' }}>
    <div style={{ marginBottom: '18px' }}>
      <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Attendance</h1>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>Employee leave and late allowance</p>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {loading ? <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : employees.length === 0 ? <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</div> : <>
        <div className="desktop-only table-container">
          <table className="clean-table" style={{ minWidth: '760px' }}>
            <thead><tr><th>Employee</th><th style={{ textAlign: 'center' }}>Leave used</th><th style={{ textAlign: 'center' }}>Half-days</th><th style={{ textAlign: 'center' }}>Leave left</th><th style={{ textAlign: 'center' }}>Late count</th><th style={{ textAlign: 'center' }}>Extra taken</th></tr></thead>
            <tbody>{employees.map(employee => <EmployeeRow key={employee.user._id} employee={employee} />)}</tbody>
          </table>
        </div>
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column' }}>
          {employees.map(employee => <EmployeeCard key={employee.user._id} employee={employee} />)}
        </div>
      </>}
    </div>
  </div>;
};

const EmployeeRow = ({ employee }) => {
  const leaveLeft = Number(employee.totalRemaining || 0);
  return <tr>
    <td><strong>{employee.user.name}</strong><div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>{employee.user.department}</div></td>
    <td style={{ textAlign: 'center', fontWeight: 600 }}>{employee.totalTaken || 0}d / {employee.totalAllotted || 0}d</td>
    <td style={{ textAlign: 'center' }}>{employee.halfDays}</td>
    <td style={{ textAlign: 'center', fontWeight: 700, color: leaveLeft > 0 ? 'var(--success)' : 'var(--warning)' }}>{leaveLeft}d</td>
    <td style={{ textAlign: 'center', fontWeight: 600 }}>{employee.late.usedCount || 0} / {employee.late.allottedCount ?? 0}</td>
    <td style={{ textAlign: 'center' }}><Extra leave={employee.extraLeave} late={employee.extraLate} /></td>
  </tr>;
};

const EmployeeCard = ({ employee }) => {
  const leaveLeft = Number(employee.totalRemaining || 0);
  return <div className="mobile-card-item" style={{ padding: '14px 16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
      <div><strong style={{ fontSize: '0.9rem' }}>{employee.user.name}</strong><div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>{employee.user.department}</div></div>
      <div style={{ textAlign: 'right', fontSize: '0.74rem' }}><span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Extra taken</span><Extra leave={employee.extraLeave} late={employee.extraLate} /></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-subtle)', borderRadius: '8px', padding: '10px', fontSize: '0.78rem' }}>
      <Metric label="Leave used" value={`${employee.totalTaken || 0}d / ${employee.totalAllotted || 0}d`} />
      <Metric label="Leave left" value={`${leaveLeft}d`} color={leaveLeft > 0 ? 'var(--success)' : 'var(--warning)'} />
      <Metric label="Half-days" value={employee.halfDays} />
      <Metric label="Late count" value={`${employee.late.usedCount || 0} / ${employee.late.allottedCount ?? 0}`} />
    </div>
  </div>;
};

const Metric = ({ label, value, color }) => <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem', marginBottom: '2px' }}>{label}</span><strong style={{ color }}>{value}</strong></div>;
