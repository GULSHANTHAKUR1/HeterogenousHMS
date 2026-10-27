import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ConfirmationDialog from './ConfirmationDialog';

export default function Header({ onToggleMobileMenu }) {
  const { doctor, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Doctor Terminal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Button */}
          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white"></span>
          </button>

          {/* Doctor Profile Banner */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {(doctor?.fullName || doctor?.name || 'Doctor').slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-navy-900 leading-tight">
                {doctor?.fullName || doctor?.name || 'Dr. Ananya Sharma'}
              </p>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {doctor?.specialty ? `${doctor.specialty} • ${doctor?.doctorId || 'DOC-108'}` : (doctor?.email || 'doctor@hospital.com')}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            title="Sign out of doctor terminal"
          >
            <LogOut className="w-4 h-4" />
          </button>
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
