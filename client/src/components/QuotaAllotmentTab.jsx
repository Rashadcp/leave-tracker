import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, Clock, Users } from 'lucide-react';
import { api } from '../services/api';

const CountInput = ({ id, label, value, onChange, suffix, step = '1' }) => (
  <div>
    <label htmlFor={id} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)', marginBottom: '7px' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input id={id} type="number" min="0" max="31" step={step} inputMode="numeric" className="input" value={value} onChange={(event) => onChange(event.target.value)} required style={{ paddingRight: '116px', fontWeight: 700, fontSize: '1rem' }} />
      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }}>{suffix}</span>
    </div>
  </div>
);

export const QuotaAllotmentTab = ({ currentUser, onActionSuccess }) => {
  const [leaveCount, setLeaveCount] = useState('2');
  const [lateCount, setLateCount] = useState('3');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAdminConsumption()
      .then((consumption) => {
        setLeaveCount(String(consumption?.policy?.monthlyLeaveDays ?? 2));
        setLateCount(String(consumption?.policy?.monthlyLateCount ?? 3));
      })
      .catch((error) => console.error('Failed to load monthly limits:', error))
      .finally(() => setLoading(false));
  }, []);

  const saveLimits = async (event) => {
    event.preventDefault();
    const leaveDays = Math.max(0, Number(leaveCount) || 0);
    const lateArrivals = Math.max(0, Math.floor(Number(lateCount) || 0));
    setSaving(true);
    try {
      const result = await api.updateAllocation({
        applyToAll: true,
        userId: 'all',
        leaveCount: leaveDays,
        lateCount: lateArrivals,
        allocatedBy: `${currentUser.name} (HR Admin)`
      });
      setLeaveCount(String(leaveDays));
      setLateCount(String(lateArrivals));
      onActionSuccess?.(result.message || 'Monthly limits updated for all employees');
    } catch (error) {
      alert(error.message || 'Failed to update monthly limits');
    } finally {
      setSaving(false);
    }
  };

  return <div style={{ maxWidth: '680px', margin: '0 auto' }}>
    <div style={{ marginBottom: '18px' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Monthly Limits</h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>Set the leave and late-arrival counts for every employee.</p>
    </div>

    <section style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
      {loading ? <div style={{ padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>Loading monthly limits…</div> : <form onSubmit={saveLimits}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DBEAFE', color: '#2563EB', display: 'grid', placeItems: 'center' }}><CalendarDays size={17} /></div>
              <div><strong style={{ fontSize: '0.9rem' }}>Leave count</strong><div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '1px' }}>Monthly leave days</div></div>
            </div>
            <CountInput id="leave-count" label="Days allowed per month" value={leaveCount} onChange={setLeaveCount} suffix="days / month" step="0.5" />
          </div>

          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}><Clock size={17} /></div>
              <div><strong style={{ fontSize: '0.9rem' }}>Late count</strong><div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '1px' }}>Monthly late arrivals</div></div>
            </div>
            <CountInput id="late-count" label="Times allowed per month" value={lateCount} onChange={setLateCount} suffix="times / month" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '16px 0 20px', color: 'var(--text-muted)', fontSize: '0.78rem' }}><Users size={15} aria-hidden="true" /><span>Saving changes updates both limits for all employees.</span></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '8px 16px', fontSize: '0.84rem', gap: '6px' }}><Check size={15} /><span>{saving ? 'Saving…' : 'Save monthly limits'}</span></button></div>
      </form>}
    </section>
  </div>;
};
