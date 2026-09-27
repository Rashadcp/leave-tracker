import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { CalendarPicker } from './CalendarPicker';

export const ApplyTab = ({ currentUser, dashboardData, initialMode = 'full', onSuccess }) => {
  // 3 Request Types: 'full' | 'half' | 'late'
  const parseInitialMode = (mode) => {
    if (mode === 'half' || mode === 'halfday') return 'half';
    if (mode === 'late') return 'late';
    return 'full';
  };

  const [requestType, setRequestType] = useState(() => parseInitialMode(initialMode));
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Common & Leave State
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [halfDayPeriod, setHalfDayPeriod] = useState('first_half');
  const [reason, setReason] = useState('');

  // Late State
  const [lateDate, setLateDate] = useState(todayStr);
  const [expectedTime, setExpectedTime] = useState('10:00');
  const [lateMinutes, setLateMinutes] = useState(30);

  useEffect(() => {
    setRequestType(parseInitialMode(initialMode));
  }, [initialMode]);

  useEffect(() => {
    api.getLeaveTypes().then(types => {
      setLeaveTypes(types || []);
      if (types?.length > 0 && !selectedLeaveType) {
        setSelectedLeaveType(types[0]._id);
      }
    }).catch(console.error);
  }, []);

  const computeDays = () => {
    if (requestType === 'half') return 0.5;
    if (!startDate || !endDate) return 1.0;
    const [y1, m1, d1] = startDate.split('-').map(Number);
    const [y2, m2, d2] = endDate.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    if (date2 < date1) return 1.0;
    return Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculatedDays = computeDays();

  const currentAlloc = dashboardData?.leaveAllocations?.find(
    a => (a.leaveTypeId?._id || a.leaveTypeId) === selectedLeaveType
  );
  const remainingDays = currentAlloc ? currentAlloc.remainingDays : 0;
  const remainingLateHours = dashboardData?.summary?.lateRemainingHours ?? 3.0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (requestType === 'late') {
      setSubmitting(true);
      try {
        const res = await api.submitLate({
          userId: currentUser._id,
          date: lateDate,
          expectedTime,
          lateMinutes: Number(lateMinutes),
          reason
        });
        onSuccess(res.message);
        setReason('');
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Leave submission (full or half)
    if (calculatedDays <= 0) {
      setErrorMessage('End date must be on or after start date');
      return;
    }

    setSubmitting(true);
    try {
      const isHalfDay = requestType === 'half';
      const res = await api.submitLeave({
        userId: currentUser._id,
        leaveTypeId: selectedLeaveType,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : 'none',
        reason
      });
      onSuccess(res.message);
      setReason('');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      {/* 3 Clear Options: Full Day | Half Day | Late */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          className={`btn ${requestType === 'full' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '9px 0', fontSize: '0.84rem', fontWeight: requestType === 'full' ? 600 : 500 }}
          onClick={() => { setRequestType('full'); setErrorMessage(''); }}
          type="button"
        >
          Full Day
        </button>
        <button 
          className={`btn ${requestType === 'half' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '9px 0', fontSize: '0.84rem', fontWeight: requestType === 'half' ? 600 : 500 }}
          onClick={() => { setRequestType('half'); setErrorMessage(''); }}
          type="button"
        >
          Half Day
        </button>
        <button 
          className={`btn ${requestType === 'late' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '9px 0', fontSize: '0.84rem', fontWeight: requestType === 'late' ? 600 : 500 }}
          onClick={() => { setRequestType('late'); setErrorMessage(''); }}
          type="button"
        >
          Late
        </button>
      </div>

      {errorMessage && (
        <div className="alert-banner alert-error" style={{ marginBottom: '14px', padding: '8px 12px' }}>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '20px' }}>
        {/* FULL DAY LEAVE FORM */}
        {requestType === 'full' && (
          <>
            <div className="form-field">
              <label className="form-label">
                <span>Leave Type</span>
                <span style={{ color: remainingDays > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {remainingDays} days left
                </span>
              </label>
              <select 
                className="select"
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
              >
                {leaveTypes.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                <span>Choose Leave Date(s)</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Click 1 date or 2 dates for a range
                </span>
              </label>
              <CalendarPicker
                startDate={startDate}
                endDate={endDate}
                mode="range"
                onChange={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
          </>
        )}

        {/* HALF DAY LEAVE FORM */}
        {requestType === 'half' && (
          <>
            <div className="form-field">
              <label className="form-label">
                <span>Leave Type</span>
                <span style={{ color: remainingDays > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {remainingDays} days left
                </span>
              </label>
              <select 
                className="select"
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
              >
                {leaveTypes.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                Choose Leave Date
              </label>
              <CalendarPicker
                startDate={startDate}
                endDate={startDate}
                mode="single"
                onChange={({ startDate: s }) => {
                  setStartDate(s);
                  setEndDate(s);
                }}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Time Slot</label>
              <select 
                className="select"
                value={halfDayPeriod}
                onChange={(e) => setHalfDayPeriod(e.target.value)}
              >
                <option value="first_half">Morning (9:30 AM - 1:00 PM)</option>
                <option value="second_half">Afternoon (1:00 PM - 5:30 PM)</option>
              </select>
            </div>
          </>
        )}

        {/* LATE ARRIVAL FORM */}
        {requestType === 'late' && (
          <>
            <div className="form-field">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                Choose Date
              </label>
              <CalendarPicker
                startDate={lateDate}
                endDate={lateDate}
                mode="single"
                onChange={({ startDate: s }) => {
                  setLateDate(s);
                }}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Arrival Time</label>
              <input 
                type="time" 
                className="input"
                value={expectedTime}
                onChange={(e) => setExpectedTime(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Minutes Late</label>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Allowed: <strong>{remainingLateHours}h left this month</strong>
                </span>
              </div>
              <input 
                type="number" 
                className="input"
                min="5" 
                max="240"
                step="5"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(e.target.value)}
                required
                style={{ marginTop: '6px' }}
              />
            </div>
          </>
        )}

        {/* REASON FIELD */}
        <div className="form-field">
          <label className="form-label">Reason</label>
          <textarea 
            className="textarea"
            placeholder={
              requestType === 'full' 
                ? 'Why do you need leave?' 
                : requestType === 'half'
                  ? 'Why do you need half day leave?'
                  : 'Why are you arriving late?'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', height: '40px', marginTop: '4px' }}
          disabled={submitting}
        >
          {submitting 
            ? 'Submitting...' 
            : requestType === 'full' 
              ? 'Submit Leave Request' 
              : requestType === 'half'
                ? 'Submit Half Day Request'
                : 'Submit Late Request'}
        </button>
      </form>
    </div>
  );
};
