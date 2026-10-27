import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';

// Route Guard
import ProtectedRoute from '../components/ProtectedRoute';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import PatientSearchPage from '../pages/PatientSearchPage';
import PatientVerifyPage from '../pages/PatientVerifyPage';
import PatientHistoryPage from '../pages/PatientHistoryPage';
import PatientReportsPage from '../pages/PatientReportsPage';
import PatientReportUploadPage from '../pages/PatientReportUploadPage';
import PatientReportDetailPage from '../pages/PatientReportDetailPage';
import PatientPrescriptionsPage from '../pages/PatientPrescriptionsPage';
import PatientPrescriptionNewPage from '../pages/PatientPrescriptionNewPage';
import SettingsPage from '../pages/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* =========================================
          PUBLIC ROUTES (AuthLayout - No Sidebar)
          ========================================= */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* =========================================
          AUTHENTICATED DOCTOR ROUTES (AppLayout + ProtectedRoute)
          ========================================= */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Core Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Patient Search & Verification Flow */}
        <Route path="/patients" element={<Navigate to="/patients/search" replace />} />
        <Route path="/patients/search" element={<PatientSearchPage />} />
        <Route path="/patients/verify" element={<PatientVerifyPage />} />

        {/* Patient 360-degree EMR History */}
        <Route path="/patients/:patientId/history" element={<PatientHistoryPage />} />

        {/* Diagnostic Reports & OCR Ingestion */}
        <Route path="/patients/:patientId/reports" element={<PatientReportsPage />} />
        <Route path="/patients/:patientId/reports/upload" element={<PatientReportUploadPage />} />
        <Route path="/patients/:patientId/reports/:reportId" element={<PatientReportDetailPage />} />

        {/* Prescriptions & Pharmacological Orders */}
        <Route path="/patients/:patientId/prescriptions" element={<PatientPrescriptionsPage />} />
        <Route path="/patients/:patientId/prescriptions/new" element={<PatientPrescriptionNewPage />} />

        {/* System Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* 404 Unknown Routes inside Authenticated Shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
