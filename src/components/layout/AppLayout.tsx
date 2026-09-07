import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useStudyStore } from '../../store/studyStore';
import { isAccessGranted } from '../../services/authService';
import { Sidebar } from '../navigation/Sidebar';
import { MobileNav } from '../navigation/MobileNav';
import { Toaster } from 'react-hot-toast';

export function AppLayout() {
  const { user, authLoading } = useStudyStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f9] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Initializing Cloud Tracker...</p>
        </div>
      </div>
    );
  }

  if (!isAccessGranted() || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#faf8f9] text-zinc-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      {/* Main Content Area */}
      <main
        className={'ransition-all duration-300 min-h-screen pb-24 lg:pb-12'}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 2500,
          style: {
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 500,
            background: '#ffffff',
            color: '#18181b',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08)',
            border: '1px solid #f4f4f5'
          }
        }}
      />
    </div>
  );
}
