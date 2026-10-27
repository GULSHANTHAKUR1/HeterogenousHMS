import React from 'react';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FileQuestion,
  title = 'No records found',
  description = 'There are currently no items to display in this section.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50 my-4">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-teal-700/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
