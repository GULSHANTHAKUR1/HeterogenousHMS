import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, Menu, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ConfirmationDialog from './ConfirmationDialog';

export default function Header({ onToggleMobileMenu }) {
  const { doctor, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract patientId if viewing a patient route (/patients/PID-xxxx/...)
  const patientMatch = location.pathname.match(/\/patients\/([^/]+)/);
  const activePatientId =
    patientMatch && !['search', 'verify'].includes(patientMatch[1]) ? patientMatch[1] : null;

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/patients/search?pid=${encodeURIComponent(globalSearch.trim().toUpperCase())}`);
      setGlobalSearch('');
    }
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Mobile Toggle & Global Search Bar (Matching screens 02 - 06) */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search patient by Patient ID (e.g. PID-2026-0124)..."
              className="w-full pl-10 pr-14 py-2 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1769E8] transition font-medium"
            />
            <span className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-mono text-slate-500 font-semibold pointer-events-none">
              Ctrl K
            </span>
          </form>
        </div>

        {/* Right Controls: Patient Authorization Badge, Notification Bell, Doctor Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Patient Authorized Pill (If on active patient route) */}
          {activePatientId && (
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-[#DDF7EC] text-[#059669] border border-[#A7F3D0] rounded-full text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>Patient authorized</span>
            </div>
          )}

          {/* Notification Bell with red count badge */}
          <button
            type="button"
            onClick={() => alert('Notifications:\n• Dr. Rahul Sharma scheduled consultation at 11:30 AM\n• Lab results ready for PID-2026-1234\n• System audit verified')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              3
            </span>
          </button>

          {/* Doctor Profile Banner (Matching reference screens) */}
          <div
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 cursor-pointer hover:opacity-90 transition group select-none"
            title="Click to sign out"
          >
            {/* Doctor Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#1769E8] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-blue-100">
              {(doctor?.fullName || doctor?.name || 'Dr. Rahul Sharma').slice(0, 2).toUpperCase()}
            </div>

            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-[#0B2450] leading-tight group-hover:text-[#1769E8] transition">
                {doctor?.fullName || doctor?.name || 'Dr. Rahul Sharma'}
              </p>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5 font-medium">
                {doctor?.specialty || 'General Physician'}
              </p>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition hidden sm:block" />
          </div>
        </div>
      </header>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        title="Sign Out Doctor Session"
        message="Are you sure you want to end your clinical session? Any unsaved medical entries will be lost."
        confirmLabel="Sign Out"
        cancelLabel="Stay Logged In"
        isDestructive={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
