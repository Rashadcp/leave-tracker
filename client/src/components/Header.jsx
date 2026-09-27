import React from 'react';
import { LogOut } from 'lucide-react';

export const Header = ({ 
  currentUser, 
  activeTab, 
  onTabChange, 
  pendingCount,
  onLogout 
}) => {
  const isHRAdmin = currentUser?.role === 'admin';
  const isApprover = currentUser?.role === 'approver';

  let navItems = [];
  if (isHRAdmin) {
    navItems = [
      { 
        id: 'approvals', 
        label: 'Approvals',
        badge: pendingCount > 0 ? pendingCount : null
      },
      { id: 'tracking', label: 'Attendance' },
      { id: 'quotas', label: 'Leave Limits' }
    ];
  } else if (isApprover) {
    navItems = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'apply', label: 'Apply' },
      { id: 'requests', label: 'Requests' },
      { 
        id: 'approvals', 
        label: 'Approvals',
        badge: pendingCount > 0 ? pendingCount : null
      }
    ];
  } else {
    // Staff member
    navItems = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'apply', label: 'Apply' },
      { id: 'requests', label: 'Requests' }
    ];
  }

  // Generate user initials for avatar badge
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const userRoleLabel = isHRAdmin 
    ? 'Administrator' 
    : (currentUser?.designation || currentUser?.department || 'Staff');

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <div className="brand-section">
          <img 
            src="/logo.png" 
            alt="Winshine" 
            className="brand-logo-img"
          />
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map(item => (
            <button
              type="button"
              id={`nav-link-${item.id}`}
              key={item.id}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* User Info & Sign Out */}
        <div className="header-actions">
          <div className="header-user-pill" title={`${currentUser?.name} (${userRoleLabel})`}>
            <div className="header-avatar">
              {initials}
            </div>
            <div className="header-user-info">
              <span className="header-user-name">
                {currentUser?.name}
              </span>
              <span className="header-user-role">
                {userRoleLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="header-logout-btn"
            onClick={onLogout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={15} />
            <span className="logout-text">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
