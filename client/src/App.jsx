import React, { useState } from 'react';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AccessDenied from './components/AccessDenied';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TrialsPage from './pages/TrialsPage';
import TrialDetailPage from './pages/TrialDetailPage';
import SafetyPage from './pages/SafetyPage';
import MonitoringPage from './pages/MonitoringPage';
import EthicsPage from './pages/EthicsPage';
import AuditPage from './pages/AuditPage';
import ExportPage from './pages/ExportPage';
import UsersPage from './pages/UsersPage';
import { RefreshCw } from 'lucide-react';

// Route-level RBAC configuration
// null / 'all' means every authenticated user can access
const ROUTE_PERMISSIONS = {
  dashboard:     null,
  trials:        null,
  'trial-detail': null,
  safety:        null,
  deviations:    [ROLES.MONITOR, ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN, ROLES.REGULATOR],
  ethics:        [ROLES.ETHICS, ROLES.ADMIN, ROLES.REGULATOR],
  audit:         [ROLES.ADMIN, ROLES.REGULATOR],
  export:        null,
  users:         [ROLES.ADMIN],
};

function ProtectedRoute({ tabId, children, onBack }) {
  const { user } = useAuth();
  const allowed = ROUTE_PERMISSIONS[tabId];

  // null means open to all authenticated users
  if (!allowed || allowed.includes(user?.designation)) {
    return children;
  }

  return <AccessDenied page={tabId} onBack={onBack} />;
}

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedTrialId, setSelectedTrialId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9F8] dark:bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-9 h-9 text-emerald-800 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Initializing Aayu-Setu Clinical Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleSelectTrial = (id) => {
    setSelectedTrialId(id);
    setCurrentTab('trial-detail');
  };

  const handleBackToTrials = () => {
    setSelectedTrialId(null);
    setCurrentTab('trials');
  };

  const handleNavigateToSafety = () => {
    setCurrentTab('safety');
  };

  const handleBackToDashboard = () => {
    setCurrentTab('dashboard');
  };

  const renderContent = () => {
    // Wrap each page in a ProtectedRoute for RBAC enforcement
    switch (currentTab) {
      case 'dashboard':
        return (
          <ProtectedRoute tabId="dashboard" onBack={handleBackToDashboard}>
            <DashboardPage onNavigate={setCurrentTab} />
          </ProtectedRoute>
        );
      case 'trials':
        return (
          <ProtectedRoute tabId="trials" onBack={handleBackToDashboard}>
            <TrialsPage onSelectTrial={handleSelectTrial} />
          </ProtectedRoute>
        );
      case 'trial-detail':
        return (
          <ProtectedRoute tabId="trial-detail" onBack={handleBackToTrials}>
            <TrialDetailPage
              trialId={selectedTrialId}
              onBack={handleBackToTrials}
              onNavigateToSafety={handleNavigateToSafety}
            />
          </ProtectedRoute>
        );
      case 'safety':
        return (
          <ProtectedRoute tabId="safety" onBack={handleBackToDashboard}>
            <SafetyPage />
          </ProtectedRoute>
        );
      case 'deviations':
        return (
          <ProtectedRoute tabId="deviations" onBack={handleBackToDashboard}>
            <MonitoringPage />
          </ProtectedRoute>
        );
      case 'ethics':
        return (
          <ProtectedRoute tabId="ethics" onBack={handleBackToDashboard}>
            <EthicsPage onSelectTrial={handleSelectTrial} />
          </ProtectedRoute>
        );
      case 'audit':
        return (
          <ProtectedRoute tabId="audit" onBack={handleBackToDashboard}>
            <AuditPage />
          </ProtectedRoute>
        );
      case 'export':
        return (
          <ProtectedRoute tabId="export" onBack={handleBackToDashboard}>
            <ExportPage />
          </ProtectedRoute>
        );
      case 'users':
        return (
          <ProtectedRoute tabId="users" onBack={handleBackToDashboard}>
            <UsersPage />
          </ProtectedRoute>
        );
      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F8] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar onNavigate={setCurrentTab} currentTab={currentTab} />
      
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab === 'trial-detail' ? 'trials' : currentTab}
          onSelectTab={(tabId) => {
            setSelectedTrialId(null);
            setCurrentTab(tabId);
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}
