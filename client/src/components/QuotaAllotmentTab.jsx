import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, X, Clock, Check } from 'lucide-react';

export const QuotaAllotmentTab = ({ currentUser, onActionSuccess }) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [lateCount, setLateCount] = useState('3');
  const [loading, setLoading] = useState(true);
  const [savingLate, setSavingLate] = useState(false);

  const PRESET_DAYS = [0.5, 1.0, 1.5, 2.0, 3.0];

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDays, setAddDays] = useState('1.0');
  const [adding, setAdding] = useState(false);

  // Edit Modal State
  const [editingType, setEditingType] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDays, setEditDays] = useState('1.0');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async (isInitial = false) => {
    if (isInitial || leaveTypes.length === 0) setLoading(true);
    try {
      const [types, cons] = await Promise.all([
        api.getLeaveTypes(),
        api.getAdminConsumption()
      ]);
      setLeaveTypes(types || []);

      if (cons?.policy) {
        setLateCount(String(cons.policy.monthlyLateCount ?? 3));
      } else {
        const firstStaff = cons?.report?.find(r => r.user.role === 'staff');
        if (firstStaff?.lateAlloc) {
          setLateCount(String(firstStaff.lateAlloc.allottedCount ?? 3));
        }
      }
    } catch (err) {
      console.error('Failed to load quota settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Save Late Grace Settings
  const handleSaveLateGrace = async (e) => {
    e.preventDefault();
    setSavingLate(true);
    try {
      await api.updateAllocation({
        applyToAll: true,
        userId: 'all',
        lateCount: Math.max(1, Number(lateCount) || 1),
        allocatedBy: `${currentUser.name} (HR Admin)`
      });
      onActionSuccess?.('Late coming rules updated for all staff');
    } catch (err) {
      alert(err.message || 'Failed to update late rules');
    } finally {
      setSavingLate(false);
    }
  };

  // Add New Quota
  const handleAddQuota = async (e) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const autoCode = (addName.trim().replace(/[^A-Za-z]/g, '').slice(0, 4) || 'QUOT').toUpperCase();
      const res = await api.createLeaveType({
        name: addName.trim(),
        code: autoCode,
        defaultMonthlyDays: Math.max(0, Number(addDays) || 1.0)
      });
      onActionSuccess?.(res.message || 'New leave type added successfully');
      setShowAddModal(false);
      setAddName('');
      setAddDays('1.0');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to add leave type');
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (lt) => {
    setEditingType(lt);
    setEditName(lt.name);
    setEditDays(String(lt.defaultMonthlyDays ?? 1.0));
  };

  // Save Edited Quota
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingType) return;
    setSavingEdit(true);
    try {
      const res = await api.updateLeaveType(editingType._id, {
        name: editName.trim(),
        code: (editingType.code || editName.trim().replace(/[^A-Za-z]/g, '').slice(0, 4) || 'QUOT').toUpperCase(),
        defaultMonthlyDays: Math.max(0, Number(editDays) || 0)
      });
      onActionSuccess?.(res.message || 'Leave type updated successfully');
      setEditingType(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update leave type');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Quota
  const handleDeleteQuota = async (lt) => {
    if (!window.confirm(`Are you sure you want to delete "${lt.name}"?\n\nThis leave category will be removed for all staff.`)) {
      return;
    }
    setDeletingId(lt._id);
    try {
      const res = await api.deleteLeaveType(lt._id);
      onActionSuccess?.(res.message || `"${lt.name}" deleted`);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete leave type');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Simple Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Leave Limits
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Monthly days and late coming rules for all staff
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.82rem', gap: '5px', borderRadius: '8px' }}
        >
          <Plus size={15} />
          <span>Add</span>
        </button>
      </div>

      {/* 1. LEAVE QUOTAS CARD */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Monthly Leave Days
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Days given to each staff member every month
            </p>
          </div>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--bg-subtle)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}>
            {leaveTypes.length} Leave Types
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Loading...
          </div>
        ) : leaveTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.86rem', margin: '0 0 8px' }}>No leave types found.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddModal(true)}
            >
              Add your first leave type
            </button>
          </div>
        ) : (
          <div>
            {leaveTypes.map((lt, idx) => (
              <div
                key={lt._id}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < leaveTypes.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: 'var(--text-primary)',
                    textTransform: 'capitalize'
                  }}>
                    {lt.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#111827',
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap'
                  }}>
                    {lt.defaultMonthlyDays} {lt.defaultMonthlyDays === 1 ? 'day' : 'days'} / month
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(lt)}
                      title="Edit leave type"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuota(lt)}
                      disabled={deletingId === lt._id}
                      title="Delete leave type"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. LATE ARRIVAL GRACE CARD */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={16} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Monthly Late Coming Rules
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              How much staff can be late each month
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveLateGrace}>
          <div style={{ marginBottom: '14px', maxWidth: '396px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Times Allowed Late
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="15"
                  className="input"
                  style={{ paddingRight: '70px', fontWeight: 600, fontSize: '0.9rem' }}
                  value={lateCount}
                  onChange={(e) => setLateCount(e.target.value)}
                  required
                />
                <span style={{ position: 'absolute', right: '10px', fontSize: '0.74rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  times / month
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingLate}
              style={{ padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600, borderRadius: '8px', gap: '6px' }}
            >
              <Check size={15} />
              <span>{savingLate ? 'Saving...' : 'Save Late Rules'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL 1: ADD NEW LEAVE TYPE */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '380px',
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Add Leave Type
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', margin: 0 }}>
                  Set leave name and monthly days for staff
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddQuota}>
              {/* Leave Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Leave Name
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. Casual Leave, Sick Leave"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Monthly Allowance */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Days Per Month
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                    Days per month
                  </span>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {PRESET_DAYS.map((preset) => {
                    const isSelected = Number(addDays) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAddDays(String(preset))}
                        style={{
                          padding: '6px 0',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #111827' : '1px solid #E2E8F0',
                          background: isSelected ? '#111827' : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {preset}d
                      </button>
                    );
                  })}
                </div>

                {/* Custom Days Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    className="input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: '100px' }}
                    value={addDays}
                    onChange={(e) => setAddDays(e.target.value)}
                    required
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    fontSize: '0.78rem',
                    color: '#64748B',
                    pointerEvents: 'none',
                    fontWeight: 500
                  }}>
                    days / month
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !addName.trim()}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 600 }}
                >
                  {adding ? 'Adding...' : 'Save Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EXISTING LEAVE TYPE */}
      {editingType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={() => setEditingType(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '380px',
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Edit Leave Type
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', margin: 0 }}>
                  Update days for {editingType.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* Leave Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Leave Name
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              {/* Monthly Allowance */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Days Per Month
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                    Days per month
                  </span>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {PRESET_DAYS.map((preset) => {
                    const isSelected = Number(editDays) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditDays(String(preset))}
                        style={{
                          padding: '6px 0',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #111827' : '1px solid #E2E8F0',
                          background: isSelected ? '#111827' : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {preset}d
                      </button>
                    );
                  })}
                </div>

                {/* Custom Days Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    className="input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: '100px' }}
                    value={editDays}
                    onChange={(e) => setEditDays(e.target.value)}
                    required
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    fontSize: '0.78rem',
                    color: '#64748B',
                    pointerEvents: 'none',
                    fontWeight: 500
                  }}>
                    days / month
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editName.trim()}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 600 }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
