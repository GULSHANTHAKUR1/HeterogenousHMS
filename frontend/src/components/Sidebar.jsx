import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Settings,
  Activity,
  FileText,
  Clock,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation();

  // Extract patientId if viewing a patient route (/patients/PID-xxxx/...)
  const patientMatch = location.pathname.match(/\/patients\/([^/]+)/);
  const activePatientId = patientMatch && !['search', 'verify'].includes(patientMatch[1]) ? patientMatch[1] : null;

  const generalItems = [
    { label: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Search Patient', path: '/patients/search', icon: Search },
    { label: 'System Settings', path: '/settings', icon: Settings },
  ];

  const patientItems = activePatientId ? [
    { label: 'Medical History', path: `/patients/${activePatientId}/history`, icon: Clock },
    { label: 'Reports & OCR', path: `/patients/${activePatientId}/reports`, icon: Activity },
    { label: 'Prescriptions', path: `/patients/${activePatientId}/prescriptions`, icon: FileText },
  ] : [];

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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-navy-950 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Branding Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-white text-base tracking-tight leading-tight truncate">
              Heterogeneous HMS
            </h1>
            <p className="text-[10px] text-teal-400/90 font-mono tracking-wider">DOCTOR TERMINAL</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3.5 space-y-1.5 flex-1 overflow-y-auto">
          <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Clinical Navigation
          </p>

          {generalItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/40 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                  }`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
              </NavLink>
            );
          })}

          {/* Active Patient Context Section */}
          {activePatientId && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-1.5">
              <div className="px-3 py-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                  Active Patient
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                  {activePatientId}
                </span>
              </div>

              {patientItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/40 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Consent EMR v1.0</span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono">B.Tech 2026</span>
        </div>
      </aside>
    </>
  );
}
