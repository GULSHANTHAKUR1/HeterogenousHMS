import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumbs from '../components/Breadcrumbs';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Automatic Breadcrumb Navigation */}
          <Breadcrumbs />

          {/* Child Page Route View */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
