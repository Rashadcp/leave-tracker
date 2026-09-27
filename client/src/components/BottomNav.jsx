import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ListOrdered, 
  CheckSquare, 
  Sliders, 
  Activity 
} from 'lucide-react';

export const BottomNav = ({ activeTab, onTabChange, role, pendingCount }) => {
  const isHRAdmin = role === 'admin';
  const isApprover = role === 'approver';

  if (isHRAdmin) {
    return (
      <nav className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => onTabChange('approvals')}
          style={{ position: 'relative' }}
        >
          <CheckSquare size={18} />
          <span>Approvals</span>
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '25%',
              background: 'var(--danger)',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '999px'
            }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => onTabChange('tracking')}
        >
          <Activity size={18} />
          <span>Attendance</span>
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'quotas' ? 'active' : ''}`}
          onClick={() => onTabChange('quotas')}
        >
          <Sliders size={18} />
          <span>Leave Limits</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="mobile-nav-bar">
      <button 
        className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onTabChange('dashboard')}
      >
        <LayoutDashboard size={18} />
        <span>Dashboard</span>
      </button>

      <button 
        className={`mobile-nav-item ${activeTab === 'apply' ? 'active' : ''}`}
        onClick={() => onTabChange('apply')}
      >
        <PlusCircle size={18} />
        <span>Apply</span>
      </button>

      <button 
        className={`mobile-nav-item ${activeTab === 'requests' ? 'active' : ''}`}
        onClick={() => onTabChange('requests')}
      >
        <ListOrdered size={18} />
        <span>Requests</span>
      </button>

      {isApprover && (
        <button 
          className={`mobile-nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => onTabChange('approvals')}
          style={{ position: 'relative' }}
        >
          <CheckSquare size={18} />
          <span>Approvals</span>
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '25%',
              background: 'var(--danger)',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '999px'
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      )}
    </nav>
  );
};
