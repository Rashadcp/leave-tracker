import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { ApplyTab } from './components/ApplyTab';
import { RequestsTab } from './components/RequestsTab';
import { ApprovalsTab } from './components/ApprovalsTab';
import { QuotaAllotmentTab } from './components/QuotaAllotmentTab';
import { TrackingTab } from './components/TrackingTab';
import { RequestDetailModal } from './components/RequestDetailModal';
import { api } from './services/api';

const AUTH_STORAGE_KEY = 'leave_auth_user';
const HR_TABS = ['approvals', 'quotas', 'tracking'];
const STAFF_TABS = ['dashboard', 'apply', 'requests'];

const getRequestedTab = () => {
  try {
    return new URLSearchParams(window.location.search).get('tab');
  } catch {
    return null;
  }
};

const hasResetToken = () => {
  try {
    return Boolean(new URLSearchParams(window.location.search).get('resetToken'));
  } catch {
    return false;
  }
};

const getAllowedTab = (user, requestedTab) => {
  const isAdmin = user?.role === 'admin';
  const allowedTabs = isAdmin ? HR_TABS : STAFF_TABS;
  const defaultTab = isAdmin ? 'approvals' : 'dashboard';
  return allowedTabs.includes(requestedTab) ? requestedTab : defaultTab;
};

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isHRAdmin = currentUser?.role === 'admin';

  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState(() => getAllowedTab(currentUser, getRequestedTab()));
  const [applyInitialMode, setApplyInitialMode] = useState('leave');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [notification, setNotification] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Respect deep links only when that page is allowed for the signed-in role.
  useEffect(() => {
    setActiveTab(getAllowedTab(currentUser, getRequestedTab()));
  }, [currentUser?.role]);

  const loadData = async (user) => {
    if (!user?._id) return;
    try {
      if (user.role === 'admin') {
        const pendingRequests = await api.getPendingApprovals();
        setPendingCount(pendingRequests?.totalCount || 0);
      } else {
        const [dash, pendingRequests] = await Promise.all([
          api.getDashboard(user._id),
          api.getPendingApprovals().catch(() => ({ totalCount: 0 }))
        ]);
        setDashboardData(dash);
        setPendingCount(pendingRequests?.totalCount || 0);
      }
    } catch (err) {
      console.error('Error loading portal data:', err);
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      loadData(currentUser);
    }
  }, [currentUser?._id, currentUser?.role]);

  const handleLoginSuccess = (user, rememberMe) => {
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    // An HR user who arrived from an email keeps the requested approvals tab.
    // A staff session is safely redirected to its dashboard instead.
    setActiveTab(getAllowedTab(user, getRequestedTab()));
    showNotification(`Signed in as ${user.name}`);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
    setDashboardData(null);
    setActiveTab('dashboard');
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const navigateTab = (tab) => {
    const safeTab = getAllowedTab(currentUser, tab);
    setActiveTab(safeTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', safeTab);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  };

  const handleNavigateApply = (mode) => {
    if (mode === 'history') {
      navigateTab('requests');
    } else {
      setApplyInitialMode(mode);
      navigateTab('apply');
    }
  };

  const handleActionSuccess = (msg) => {
    showNotification(msg);
    if (currentUser?._id) {
      loadData(currentUser);
    }
  };

  // If not logged in, show simple clean Login Page
  if (!currentUser || hasResetToken()) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Header & Navigation */}
      <Header 
        currentUser={currentUser}
        activeTab={activeTab}
                onTabChange={navigateTab}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {notification && (
          <div className="alert-banner alert-success">
            <span>{notification}</span>
          </div>
        )}

        {/* HR ADMIN VIEWS */}
        {isHRAdmin ? (
          <>
            {activeTab === 'approvals' && (
              <ApprovalsTab 
                currentUser={currentUser}
                onActionSuccess={handleActionSuccess}
                onNavigateTab={navigateTab}
              />
            )}

            {activeTab === 'quotas' && (
              <QuotaAllotmentTab 
                currentUser={currentUser}
                onActionSuccess={handleActionSuccess}
              />
            )}

            {activeTab === 'tracking' && (
              <TrackingTab 
                currentUser={currentUser}
              />
            )}
          </>
        ) : (
          /* EMPLOYEE VIEWS */
          <>
            {activeTab === 'dashboard' && (
              <HomeTab 
                dashboardData={dashboardData}
                onNavigateApply={handleNavigateApply}
                onSelectRequest={(item) => setSelectedRequest(item)}
              />
            )}

            {activeTab === 'apply' && (
              <ApplyTab 
                currentUser={currentUser}
                dashboardData={dashboardData}
                initialMode={applyInitialMode}
                onSuccess={(msg) => {
                  handleActionSuccess(msg);
                  navigateTab('requests');
                }}
              />
            )}

            {activeTab === 'requests' && (
              <RequestsTab 
                currentUser={currentUser}
                onSelectRequest={(item) => setSelectedRequest(item)}
              />
            )}

            {currentUser.role === 'approver' && activeTab === 'approvals' && (
              <ApprovalsTab 
                currentUser={currentUser}
                onActionSuccess={handleActionSuccess}
                onNavigateTab={navigateTab}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab}
        onTabChange={navigateTab}
        role={currentUser?.role}
        pendingCount={pendingCount}
      />

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

export default App;
