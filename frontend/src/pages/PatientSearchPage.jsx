import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  ShieldCheck,
  Lock,
  Users,
  IdCard,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
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
      setError('Patient ID must follow format PID-YYYY-XXXX (e.g., PID-2026-1234 or PID-2026-0124)');
      return;
    }

    setSearching(true);
    try {
      setSearchStatus('Looking up patient record...');
      const searchRes = await api.get(`/v1/patients/search?pid=${encodeURIComponent(cleanPid)}`);
      const patientSummary = searchRes.data;

      setSearchStatus(`Dispatching verification code to ${patientSummary.contactNumberMasked}...`);
      let activeDevOtp = '';
      try {
        const chalRes = await api.post(`/v1/patients/${encodeURIComponent(cleanPid)}/challenge-otp`);
        activeDevOtp = chalRes.data?.devOtp || chalRes.devOtp || '';
      } catch (challengeErr) {
        if (challengeErr.code !== 'RESEND_COOLDOWN_ACTIVE') {
          throw challengeErr;
        }
      }

      // Navigate to Step 3 (Patient OTP Verification)
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

  return (
    <div className="space-y-7 max-w-6xl mx-auto py-2">
      {/* =========================================================================
          STEPPER PROGRESS BAR (Matching 02-patient-id-search.png)
          ========================================================================= */}
      <div className="flex items-center justify-center max-w-3xl mx-auto px-4 py-2">
        <div className="flex items-center w-full">
          {/* Step 1: Doctor Login */}
          <div className="flex flex-col items-center relative text-center">
            <div className="w-8 h-8 rounded-full bg-[#EDF5FF] text-[#1769E8] border border-[#D9EBFF] flex items-center justify-center font-bold text-xs shadow-2xs">
              1
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-1.5 whitespace-nowrap">
              Doctor Login
            </span>
          </div>

          {/* Line 1 -> 2 */}
          <div className="flex-1 h-0.5 bg-[#1769E8] mx-2 -mt-4"></div>

          {/* Step 2: Patient ID (Active) */}
          <div className="flex flex-col items-center relative text-center">
            <div className="w-8 h-8 rounded-full bg-[#1769E8] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/25 ring-4 ring-blue-100">
              2
            </div>
            <span className="text-[11px] font-bold text-[#0B2450] mt-1.5 whitespace-nowrap">
              Patient ID
            </span>
          </div>

          {/* Line 2 -> 3 */}
          <div className="flex-1 h-0.5 bg-slate-200 mx-2 -mt-4"></div>

          {/* Step 3: Patient OTP */}
          <div className="flex flex-col items-center relative text-center">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1.5 whitespace-nowrap">
              Patient OTP
            </span>
          </div>

          {/* Line 3 -> 4 */}
          <div className="flex-1 h-0.5 bg-slate-200 mx-2 -mt-4"></div>

          {/* Step 4: Medical History */}
          <div className="flex flex-col items-center relative text-center">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1.5 whitespace-nowrap">
              Medical History
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE TITLE
          ========================================================================= */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-[#0B2450] tracking-tight">
          Search Patient
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Enter the patient's unique ID to request access.
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          MAIN SEARCH CARD (Matching 02-patient-id-search.png)
          ========================================================================= */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-xs p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Form (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-5">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0B2450] mb-2">
                  Patient ID
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="PID-2026-0124"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-[#1769E8] focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={searching}
                className="w-full py-3.5 px-6 bg-[#1769E8] hover:bg-[#0F57C8] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? (searchStatus || 'Finding Patient...') : 'Find Patient'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Privacy Guarantee Box (Matching 02-patient-id-search.png) */}
            <div className="p-3.5 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#059669] leading-snug">
                Patient records remain private until authorization is verified.
              </p>
            </div>

            {/* Demo Helper Links */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-[#1769E8]" />
              <span>Quick demo IDs:</span>
              <button
                type="button"
                onClick={() => setPatientId('PID-2026-1234')}
                className="font-mono text-[#1769E8] font-bold hover:underline"
              >
                PID-2026-1234
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setPatientId('PID-2026-5678')}
                className="font-mono text-[#1769E8] font-bold hover:underline"
              >
                PID-2026-5678
              </button>
            </div>
          </div>

          {/* Right Illustration (lg:col-span-6) */}
          <div className="lg:col-span-6 flex justify-center">
            {/* Vector Illustration Card representing Patient ID & Privacy */}
            <div className="relative w-full max-w-sm bg-gradient-to-br from-blue-50/70 to-teal-50/60 rounded-3xl p-6 border border-blue-100 flex items-center justify-center">
              {/* Background Glow */}
              <div className="absolute w-48 h-48 bg-teal-200/30 rounded-full blur-2xl"></div>

              {/* ID Card Graphic Mockup */}
              <div className="relative z-10 w-full bg-white rounded-2xl border border-slate-200/80 shadow-lg p-5 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-slate-200 rounded-full w-3/4"></div>
                    <div className="h-2 bg-slate-100 rounded-full w-1/2"></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                  <div className="h-2 bg-slate-100 rounded-full w-5/6"></div>
                </div>

                {/* Barcode Graphic */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex gap-0.5 items-center h-5">
                    {[2, 4, 1, 3, 5, 2, 4, 1, 3, 2, 5, 1, 4, 2].map((w, i) => (
                      <div key={i} className="bg-slate-300 h-full" style={{ width: `${w * 1.5}px` }}></div>
                    ))}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#DDF7EC] text-[#059669] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Magnifying Glass Overlay */}
              <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl bg-[#1769E8] text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Search className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM 3 HIGHLIGHT CARDS (Matching 02-patient-id-search.png)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Unique Patient ID */}
        <div className="p-5 rounded-2xl bg-[#EDF5FF] border border-[#D9EBFF] text-left transition hover:bg-white hover:border-blue-300 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#1769E8] text-white flex items-center justify-center mb-3 shadow-xs">
            <IdCard className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0B2450]">Unique Patient ID</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Each patient has a unique identifier to keep records organized and accurate.
          </p>
        </div>

        {/* Card 2: Secure Access */}
        <div className="p-5 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] text-left transition hover:bg-white hover:border-emerald-300 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center mb-3 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0B2450]">Secure Access</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Medical information is only visible after the patient verifies with an OTP.
          </p>
        </div>

        {/* Card 3: Patient Privacy */}
        <div className="p-5 rounded-2xl bg-[#EFE7FF] border border-[#D8C5FD] text-left transition hover:bg-white hover:border-purple-300 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center mb-3 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0B2450]">Patient Privacy</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            All records are protected and accessible only with the patient's consent.
          </p>
        </div>
      </div>
    </div>
  );
}
