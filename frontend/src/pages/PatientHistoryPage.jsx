import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Plus,
  FileText,
  Activity,
  Calendar,
  AlertCircle,
  ExternalLink,
  Phone,
  Droplet,
  Sparkles,
  ArrowRight,
  Clock,
  HeartPulse,
  CheckCircle2,
  Lock,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import PageTitle from '../components/PageTitle';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import api from '../services/api';

export default function PatientHistoryPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [grantInfo, setGrantInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    const fetchAuthorizedHistory = async () => {
      setLoading(true);
      setAuthError(null);

      try {
        const [historyRes, reportsRes] = await Promise.all([
          api.get(`/v1/patients/${encodeURIComponent(pid)}/history`),
          api.get(`/v1/patients/${encodeURIComponent(pid)}/reports`).catch(() => ({ data: [] })),
        ]);

        setPatient(historyRes.data);
        setGrantInfo(historyRes.grant);
        setRecentReports(reportsRes.data || []);
      } catch (err) {
        // 403 Access Denied: missing, revoked, expired, or mismatched grant
        setAuthError(err.message || 'Patient consent authorization grant required.');
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorizedHistory();
  }, [pid]);

  const handleRevokeAccess = async () => {
    if (!grantInfo?.grantId) return;
    setRevoking(true);
    try {
      await api.post(`/v1/patients/${encodeURIComponent(pid)}/revoke-access`, {
        grantId: grantInfo.grantId,
      });
      sessionStorage.removeItem(`hms_grant_${pid}`);
      setAuthError('Clinical session access grant was revoked.');
      setPatient(null);
    } catch (err) {
      console.warn('Revoke error:', err.message);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <LoadingState message="Verifying patient consent authorization and retrieving medical history..." />;
  }

  // 1. UNAUTHORIZED / CONSENT REQUIRED SCREEN
  if (authError || !patient) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Patient Medical History"
          subtitle="Protected EMR Record Access"
          badge="Access Restricted"
        />

        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold font-heading text-navy-900 tracking-tight">
            Patient Consent Required
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Clinical records and diagnostic history for{' '}
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {pid}
            </span>{' '}
            cannot be accessed without an active, verified Patient Access Grant.
          </p>

          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/patients/verify?pid=${encodeURIComponent(pid)}`)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
            >
              <span>Verify Patient Consent OTP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/patients/search"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              Search Another Patient
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHORIZED MEDICAL HISTORY VIEW

  const recentVisits = [
    {
      date: '12 Oct 2026',
      doctor: 'Dr. Rahul Mehta, MD',
      department: 'Internal Medicine',
      diagnosis: 'Fatigue & Anemia Follow-up',
      vitals: 'BP: 128/84 mmHg • Pulse: 78 bpm • SpO2: 99%',
    },
    {
      date: '05 Aug 2026',
      doctor: 'Dr. S. K. Sharma, MD',
      department: 'Pulmonology',
      diagnosis: 'Mild Bronchial Cough Check',
      vitals: 'BP: 122/80 mmHg • Pulse: 72 bpm • SpO2: 98%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Profile Card (Screen 4 from Infographic) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Patient Avatar Graphic */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-pastel-blue border border-pastel-blue-border text-blue-700 flex items-center justify-center font-bold font-heading text-2xl sm:text-3xl shrink-0 shadow-xs">
              {(patient.firstName?.[0] || 'R') + (patient.lastName?.[0] || 'S')}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-navy-900 tracking-tight">
                  {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                </h1>
                <span className="text-xs font-mono font-bold bg-pastel-mint text-emerald-800 px-3 py-1 rounded-full border border-pastel-mint-border">
                  {patient.patientId}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Authorized Session Active
                </span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 mt-2">
                <span><strong>Age:</strong> {patient.age || 32}</span>
                <span><strong>Gender:</strong> {patient.gender}</span>
                <span className="flex items-center gap-1">
                  <Droplet className="w-3.5 h-3.5 text-rose-500" />
                  <strong>Blood group:</strong> {patient.bloodGroup || 'B+'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <strong>Contact:</strong> {patient.contactNumberMasked || '+91 98765-XXXXX'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate(`/patients/${pid}/reports/upload`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm shadow-teal-700/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Report</span>
            </button>
            <button
              onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Prescription</span>
            </button>
            <button
              onClick={handleRevokeAccess}
              disabled={revoking}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition"
              title="End active clinical session for this patient"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Real URL Sub-Navigation Tabs */}
        <div className="flex gap-2 pt-4 border-b border-slate-100 overflow-x-auto">
          <Link
            to={`/patients/${pid}/history`}
            className="px-4 py-2.5 text-xs font-bold text-teal-700 border-b-2 border-teal-600 whitespace-nowrap"
          >
            Overview
          </Link>
          <Link
            to={`/patients/${pid}/reports`}
            className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg transition whitespace-nowrap"
          >
            Reports
          </Link>
          <Link
            to={`/patients/${pid}/prescriptions`}
            className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg transition whitespace-nowrap"
          >
            Prescriptions
          </Link>
        </div>
      </div>

      {/* Key Medical Summary Pills on Pastel Surfaces (Matching Infographic) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="text-xs font-bold font-heading text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          Key Medical Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
            patient.chronicConditions.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  idx === 0
                    ? 'border-pastel-purple-border bg-pastel-purple'
                    : 'border-pastel-blue-border bg-pastel-blue'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    idx === 0 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {idx === 0 ? <AlertCircle className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold font-heading text-navy-900">
                    {item.condition}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {item.diagnosedYear ? `Diagnosed Since ${item.diagnosedYear}` : 'Chronic Medical Diagnosis'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl border border-pastel-purple-border bg-pastel-purple">
              <p className="text-xs font-bold text-purple-950">No Chronic Conditions</p>
            </div>
          )}

          {/* Allergy Card */}
          <div className="p-4 rounded-2xl border border-pastel-mint-border bg-pastel-mint flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold font-heading text-emerald-950">Allergies</p>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {patient.allergies?.join(', ') || 'None Known'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold font-heading text-navy-900">Recent Reports</h2>
            <p className="text-xs text-slate-400">Scanned files converted via OCR & NLP into structured records</p>
          </div>
          <Link
            to={`/patients/${pid}/reports`}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Report Type</th>
                <th className="px-6 py-3.5">Key Findings</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    No diagnostic reports found. Upload a medical sheet to start OCR entity extraction.
                  </td>
                </tr>
              ) : (
                recentReports.map((report) => {
                  const repId = report.id || report.reportId;
                  const findings = report.findingsSummary || report.keyFindings || (report.nlpFindings && report.nlpFindings.join(' • ')) || 'OCR Digitized';
                  return (
                    <tr key={repId} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 text-slate-600 font-medium">{report.date}</td>
                      <td className="px-6 py-4 font-bold text-navy-900">{report.title || report.reportType}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{findings}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/patients/${pid}/reports/${repId}`)}
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold hover:underline"
                        >
                          <span>View OCR</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Timeline / Recent Consultations */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="text-sm font-bold font-heading text-navy-900 mb-4">Patient Medical Timeline</h2>
        <div className="space-y-4">
          {recentVisits.map((visit, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-navy-900">{visit.diagnosis}</span>
                    <span className="text-[10px] text-slate-400">• {visit.department}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{visit.vitals}</p>
                </div>
              </div>
              <div className="text-xs text-slate-400 sm:text-right">
                <p className="font-semibold text-slate-700">{visit.date}</p>
                <p className="text-[11px]">{visit.doctor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
