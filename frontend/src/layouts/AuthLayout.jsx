import React from 'react';
import { Outlet } from 'react-router-dom';
import { Activity, ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header bar */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-tight">Heterogeneous HMS</h1>
            <p className="text-[10px] text-teal-400/80 font-mono tracking-wider">HOSPITAL MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">HIPAA / Consent Compliant</span>
        </div>
      </header>

      {/* Main content slot */}
      <main className="flex-1 flex items-center justify-center py-8">
        <Outlet />
      </main>

      {/* Footer bar */}
      <footer className="text-center text-xs text-slate-500 max-w-6xl w-full mx-auto pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>B.Tech Capstone Project • Heterogeneous Clinical Data Integration</p>
        <p className="text-[11px] text-slate-500">Node.js • React • MongoDB • FastAPI OCR</p>
      </footer>
    </div>
  );
}
