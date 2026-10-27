import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  FolderOpen,
  FileText,
  Pill,
  FlaskConical,
  Calendar,
  Settings,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Extract patientId if viewing a patient route (/patients/PID-xxxx/...)
  const patientMatch = location.pathname.match(/\/patients\/([^/]+)/);
  const activePatientId =
    patientMatch && !['search', 'verify'].includes(patientMatch[1])
      ? patientMatch[1]
      : 'PID-2026-1234';

  const menuItems = [
    { label: 'Overview', path: '/dashboard', icon: Home },
    { label: 'Search Patient', path: '/patients/search', icon: Search },
    { label: 'Medical History', path: `/patients/${activePatientId}/history`, icon: FolderOpen },
    { label: 'Reports', path: `/patients/${activePatientId}/reports`, icon: FileText },
    { label: 'Prescriptions', path: `/patients/${activePatientId}/prescriptions`, icon: Pill },
    { label: 'Lab Tests', path: `/patients/${activePatientId}/reports`, icon: FlaskConical },
    { label: 'Appointments', path: '/dashboard', icon: Calendar },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B2450] text-slate-300 flex flex-col justify-between border-r border-[#081B3D] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Header & Menu */}
        <div>
          {/* Logo / Brand Header (Matching reference screens) */}
          <div className="p-5 border-b border-[#0F326E] flex items-center gap-3">
            {/* White medical cross logo with ECG */}
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <rect x="19" y="5" width="10" height="38" rx="5" fill="#1769E8" />
                <rect x="5" y="19" width="38" height="10" rx="5" fill="#1769E8" />
                <path
                  d="M9 24H16L19 19L23 29L27 15L30 26L32 24H39"
                  stroke="white"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-extrabold text-white text-[15px] tracking-tight leading-tight truncate">
                Heterogeneous HMS
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Hospital Management System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#1769E8] text-white shadow-md shadow-[#1769E8]/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
            >
              <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        {/* Bottom Banner Card (Matching reference 02, 03, 04, 05, 06) */}
        <div className="p-4">
          <div className="p-3.5 rounded-2xl bg-[#071A3B] border border-[#0F326E] flex items-center gap-3 shadow-inner">
            <div className="w-9 h-9 rounded-xl bg-[#1769E8]/20 text-[#1769E8] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">Care with Technology</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Secure. Simple. Smarter.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
