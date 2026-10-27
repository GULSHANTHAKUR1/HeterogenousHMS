import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import api from '../services/api';

export default function PatientSearchPage() {
  const [patientId, setPatientId] = useState('PID-2026-1234');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSearchStatus('');

    const cleanPid = patientId.trim().toUpperCase();
    if (!cleanPid) {
      setError('Please provide a valid Patient ID.');
      return;
    }

    if (!/^PID-\d{4}-\d{4}$/.test(cleanPid)) {
      setError('Patient ID must follow format PID-YYYY-XXXX (e.g., PID-2026-1234)');
      return;
    }

    setSearching(true);
    try {
      setSearchStatus('Looking up patient record...');
      // 1. Search patient (retrieves non-clinical identifiers and masked phone only)
      const searchRes = await api.get(`/v1/patients/search?pid=${encodeURIComponent(cleanPid)}`);
      const patientSummary = searchRes.data;

      setSearchStatus(`Dispatching verification code to ${patientSummary.contactNumberMasked}...`);
      // 2. Initiate OTP challenge
      let activeDevOtp = '';
      try {
        const chalRes = await api.post(`/v1/patients/${encodeURIComponent(cleanPid)}/challenge-otp`);
        activeDevOtp = chalRes.data?.devOtp || chalRes.devOtp || '';
      } catch (challengeErr) {
        // If challenge is already active within cooldown, we still proceed to verify screen
        if (challengeErr.code !== 'RESEND_COOLDOWN_ACTIVE') {
          throw challengeErr;
        }
      }

      // 3. Navigate to Step 3 (Patient OTP Verification)
      navigate(
        `/patients/verify?pid=${encodeURIComponent(cleanPid)}&maskedPhone=${encodeURIComponent(
          patientSummary.contactNumberMasked || '+91 98765-XXXXX'
        )}${activeDevOtp ? `&devOtp=${encodeURIComponent(activeDevOtp)}` : ''}`
      );
    } catch (err) {
      setError(err.message || 'Unable to locate patient record. Please check the Patient ID.');
    } finally {
      setSearching(false);
      setSearchStatus('');
    }
  };

  const samplePatients = [
    { pid: 'PID-2026-1234', name: 'Rahul Sharma', desc: 'Blood panel & complete history available' },
    { pid: 'PID-2026-5678', name: 'Priya Patel', desc: 'Pulmonology consultation & chest radiograph' },
    { pid: 'PID-2026-9012', name: 'Amit Verma', desc: 'Cardiology lipid profile test record' },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Search Patient"
        subtitle="Lookup patient by unique ID and initiate patient-consented OTP verification"
        badge="Screen 2 of Workflow"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Search Card (Screen 2 from Infographic) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-pastel-blue border border-pastel-blue-border flex items-center justify-center text-blue-600 shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-navy-900">Enter Patient ID</h2>
              <p className="text-xs text-slate-500">
                Provided by the patient at clinical reception or hospital card
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Patient ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. PID-2026-1234"
                  required
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-base font-mono font-bold tracking-wider text-navy-900 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? (searchStatus || 'Processing Request...') : 'Search'}</span>
            </button>
          </form>

          {/* Quick-Pick Demo Patients */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Available Sample Patient IDs:
            </p>
            <div className="space-y-2">
              {samplePatients.map((item) => (
                <button
                  key={item.pid}
                  type="button"
                  onClick={() => {
                    setPatientId(item.pid);
                    setError('');
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                    patientId === item.pid
                      ? 'border-teal-500 bg-pastel-mint'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-navy-900">{item.pid}</span>
                    <span className="text-xs text-slate-600 ml-2 font-medium">({item.name})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Authorization Required State Card */}
        <div className="bg-pastel-blue border border-pastel-blue-border rounded-3xl p-5 sm:p-6 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-heading text-blue-950 uppercase tracking-wider">
              Patient Consent Authorization Required
            </h3>
            <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
              In Heterogeneous HMS, clinical records and diagnostic images cannot be accessed by any physician
              without explicit patient consent. Once you enter the Patient ID, a secure 6-digit one-time password
              is dispatched to the patient's registered mobile phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
