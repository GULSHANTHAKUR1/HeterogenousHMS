import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout: Minimal transparent wrapper so the landing login page
 * has complete control over its full-width header, hero, and visual styling.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-[#F4F9FD]">
      <Outlet />
    </div>
  );
}
