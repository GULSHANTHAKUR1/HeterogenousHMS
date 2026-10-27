import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while processing this clinical request.',
  onRetry,
}) {
  return (
    <div className="py-10 px-6 bg-rose-50/50 border border-rose-200 rounded-2xl text-center max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-rose-950">{title}</h3>
      <p className="text-xs text-rose-800 mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}
