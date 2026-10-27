import React from 'react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (normalized === 'normal') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (normalized === 'high') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    dotColor = 'bg-rose-500';
  } else if (normalized === 'low') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    dotColor = 'bg-amber-500';
  } else if (normalized === 'abnormal') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    dotColor = 'bg-rose-500';
  } else if (normalized === 'pending' || normalized === 'processing') {
    styles = 'bg-blue-50 text-blue-800 border-blue-200';
    dotColor = 'bg-blue-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span>{status}</span>
    </span>
  );
}
