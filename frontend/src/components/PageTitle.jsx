import React from 'react';

export default function PageTitle({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-navy-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
