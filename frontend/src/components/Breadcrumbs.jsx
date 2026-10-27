import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'login') {
    return null;
  }

  // Human-friendly labels for path segments
  const labelMap = {
    dashboard: 'Dashboard',
    patients: 'Patients',
    search: 'Search',
    verify: 'OTP Verification',
    history: 'Medical History',
    reports: 'Reports',
    upload: 'Upload Report',
    prescriptions: 'Prescriptions',
    new: 'New Prescription',
    settings: 'Settings',
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap py-1">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-teal-700 transition font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>HMS</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = labelMap[name] || name;

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 bg-slate-100/70 px-2 py-0.5 rounded-md">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-teal-700 transition font-medium text-slate-600"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
