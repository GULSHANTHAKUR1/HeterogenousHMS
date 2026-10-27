import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Activity,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import PageTitle from '../components/PageTitle';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { doctor } = useAuth();
  const navigate = useNavigate();

  // 4 Summary cards styled with light pastel-blue, mint-green, pale-purple, and amber surfaces
  const summaryCards = [
    {
      label: "Today's Consultations",
      count: '14 Patients',
      hint: '3 Scheduled this morning',
      icon: Users,
      surface: 'bg-pastel-blue border-pastel-blue-border text-blue-900',
      iconColor: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Verified via Patient OTP',
      count: '138 Sessions',
      hint: 'Consent compliance 100%',
      icon: ShieldCheck,
      surface: 'bg-pastel-mint border-pastel-mint-border text-emerald-950',
      iconColor: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Scanned Lab Reports',
      count: '462 Ingested',
      hint: 'PyMuPDF + Tesseract OCR',
      icon: Activity,
      surface: 'bg-pastel-purple border-pastel-purple-border text-purple-950',
      iconColor: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Digital Prescriptions',
      count: '891 Active Rx',
      hint: 'Saved in MongoDB Atlas',
      icon: FileText,
      surface: 'bg-amber-50/70 border-amber-200 text-amber-950',
      iconColor: 'bg-amber-100 text-amber-600',
    },
  ];

  // Fictional clinical queue
  const recentConsultations = [
    {
      pid: 'PID-2026-1234',
      name: 'Rahul Sharma',
      age: 32,
      gender: 'Male',
      reason: 'Routine Complete Blood Count & Fatigue Review',
      time: '10:30 AM',
      status: 'Pending OTP Verification',
    },
    {
      pid: 'PID-2026-5678',
      name: 'Priya Patel',
      age: 28,
      gender: 'Female',
      reason: 'Chest Radiograph (PA) Pulmonology Inspection',
      time: '11:15 AM',
      status: 'Ready for Review',
    },
    {
      pid: 'PID-2026-9012',
      name: 'Amit Verma',
      age: 45,
      gender: 'Male',
      reason: 'Biochemistry Lipid Panel Follow-up',
      time: '12:00 PM',
      status: 'Awaiting Lab Ingestion',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Heading & Find Patient Action */}
      <PageTitle
        title={`Welcome, ${doctor?.name || 'Dr. Rahul Mehta, MD'}`}
        subtitle="Heterogeneous Hospital Management System • Clinical Physician Station"
        badge="Online"
        actions={
          <button
            onClick={() => navigate('/patients/search')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm shadow-teal-700/20"
          >
            <Search className="w-4 h-4" />
            <span>Find Patient</span>
          </button>
        }
      />

      {/* 4 Pastel Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${card.surface}`}
            >
              <div>
                <p className="text-xs font-semibold opacity-75">{card.label}</p>
                <p className="text-xl sm:text-2xl font-bold font-heading mt-1">{card.count}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{card.hint}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow Navigation Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Consent-Based Patient Access Flow
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-heading text-navy-900 tracking-tight">
            Look up a Patient to Inspect Scanned Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Enter the patient's ID to dispatch an automated OTP to their mobile phone. Once verified,
            you will have full access to their 360-degree timeline, OCR parsed lab tables, and NLP alerts.
          </p>
        </div>

        <button
          onClick={() => navigate('/patients/search')}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-teal-700/20 flex items-center gap-2 shrink-0"
        >
          <span>Find Patient</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Recent Activity / Consultation Queue */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold font-heading text-navy-900">Recent Clinical Activity</h2>
            <p className="text-xs text-slate-400">Scheduled outpatient appointments awaiting doctor access</p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 self-start sm:self-auto">
            3 Outpatients Queued
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Patient ID</th>
                <th className="px-6 py-3.5">Patient Name</th>
                <th className="px-6 py-3.5">Demographics</th>
                <th className="px-6 py-3.5">Reason for Visit</th>
                <th className="px-6 py-3.5">Scheduled</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentConsultations.map((item) => (
                <tr key={item.pid} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4 font-mono font-bold text-teal-700">{item.pid}</td>
                  <td className="px-6 py-4 font-semibold text-navy-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.age} yrs • {item.gender}</td>
                  <td className="px-6 py-4 text-slate-600">{item.reason}</td>
                  <td className="px-6 py-4 text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.time}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/patients/verify?pid=${encodeURIComponent(item.pid)}`)}
                      className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold hover:underline"
                    >
                      <span>Verify OTP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
