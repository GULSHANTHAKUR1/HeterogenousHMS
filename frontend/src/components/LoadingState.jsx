import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading clinical data...', fullScreen = false }) {
  const containerClass = fullScreen
    ? 'fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'
    : 'py-12 flex flex-col items-center justify-center text-center';

  return (
    <div className={containerClass}>
      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 mb-3 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-800 tracking-tight">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
    </div>
  );
}
