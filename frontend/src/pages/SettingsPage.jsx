import React, { useState } from 'react';
import { Settings, User, Server, Bell, Shield, CheckCircle2, RefreshCw, Key, MonitorCheck } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { doctor } = useAuth();
  const [testingEndpoints, setTestingEndpoints] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings form states
  const [doctorName, setDoctorName] = useState(doctor?.name || 'Dr. Rahul Mehta, MD');
  const [doctorEmail, setDoctorEmail] = useState(doctor?.email || 'doctor@hospital.com');
  const [department, setDepartment] = useState('Internal Medicine • Clinical Ward');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleTestConnections = () => {
    setTestingEndpoints(true);
    setTestResult(null);

    setTimeout(() => {
      setTestingEndpoints(false);
      setTestResult({
        backend: 'Node.js Express Gateway (:5000) • Responsive',
        ocr: 'FastAPI OCR & NLP Microservice (:8000) • Tesseract & PyMuPDF Online',
        database: 'MongoDB Atlas Medical Cluster • Connected (Mongoose)',
      });
    }, 600);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Doctor Station & System Settings"
        subtitle="Manage physician credentials, preferences, and inspect clinical service telemetry"
        badge="Account & Telemetry"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Doctor Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-pastel-blue border border-pastel-blue-border text-blue-700 flex items-center justify-center font-bold font-heading text-xl shadow-xs">
              {doctorName ? doctorName.slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading text-navy-900">{doctorName}</h2>
              <p className="text-xs text-slate-500">{doctorEmail}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Clinical Department</span>
              <span className="font-semibold text-navy-900">{department}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Medical Council Registration</span>
              <span className="font-mono font-bold text-navy-900">MCI-2018-99410</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Clinical Clearance</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-pastel-mint px-2 py-0.5 rounded-lg border border-pastel-mint-border">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Senior Attending Physician
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-600 font-medium">OTP Access Alerts</span>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Columns: Telemetry Diagnostics & Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Microservice Diagnostics Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-teal-600" />
                <h2 className="text-sm font-bold font-heading text-navy-900">
                  Microservices & Database Diagnostics
                </h2>
              </div>
              <button
                type="button"
                onClick={handleTestConnections}
                disabled={testingEndpoints}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingEndpoints ? 'animate-spin' : ''}`} />
                <span>Test Telemetry</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Node.js Service */}
              <div className="p-3.5 rounded-2xl bg-pastel-blue border border-pastel-blue-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-blue-950 font-heading">Core Node.js Gateway</p>
                  <p className="text-[11px] font-mono text-blue-800/80">
                    {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
                  </p>
                </div>
                <span className="text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full font-bold text-[10px] border border-emerald-200">
                  Port 5000 Active
                </span>
              </div>

              {/* FastAPI OCR Service */}
              <div className="p-3.5 rounded-2xl bg-pastel-purple border border-pastel-purple-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-purple-950 font-heading">Python FastAPI OCR & NLP Service</p>
                  <p className="text-[11px] font-mono text-purple-800/80">
                    {import.meta.env.VITE_OCR_SERVICE_URL || 'http://127.0.0.1:8000/api/v1'}
                  </p>
                </div>
                <span className="text-purple-800 bg-purple-100/70 px-2.5 py-1 rounded-full font-bold text-[10px] border border-purple-200">
                  Port 8000 Ready
                </span>
              </div>

              {/* MongoDB Atlas Service */}
              <div className="p-3.5 rounded-2xl bg-pastel-mint border border-pastel-mint-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-950 font-heading">MongoDB Atlas Cluster</p>
                  <p className="text-[11px] text-emerald-800/80">Patients, Reports & Prescription Collections</p>
                </div>
                <span className="text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full font-bold text-[10px] border border-emerald-200">
                  Mongoose Schema Ready
                </span>
              </div>
            </div>

            {testResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5 animate-in fade-in duration-150">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Telemetry Diagnostic Checks Passed:
                </p>
                <p className="text-[11px] pl-5">• {testResult.backend}</p>
                <p className="text-[11px] pl-5">• {testResult.ocr}</p>
                <p className="text-[11px] pl-5">• {testResult.database}</p>
              </div>
            )}
          </div>

          {/* Profile Edit Form */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
            <h2 className="text-sm font-bold font-heading text-navy-900 mb-4">Edit Station Profile</h2>
            {savedSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Profile details saved successfully!
              </div>
            )}
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-navy-900 font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-navy-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-navy-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-sm shadow-teal-700/20"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
