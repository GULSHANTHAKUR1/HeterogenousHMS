import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-4 shadow-sm">
        <FileQuestion className="w-8 h-8" />
      </div>
      <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200 mb-2">
        Error 404
      </span>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Page Not Found</h1>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
        The requested clinical route does not exist or has been relocated within the hospital management system.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-sm shadow-teal-700/20"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Clinical Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
