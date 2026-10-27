import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Lock,
  Info,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Copy,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';

export default function PatientVerifyPage() {
  const [searchParams] = useSearchParams();
  const pid = searchParams.get('pid') || 'PID-2026-1234';
  const maskedPhone = searchParams.get('maskedPhone') || '+91 98XXX XXXXX';
  const paramOtp = searchParams.get('devOtp') || '482731';

  // Live OTP and digits
  const [liveOtp, setLiveOtp] = useState(paramOtp);
  const [digits, setDigits] = useState(paramOtp.split(''));
  const [countdown, setCountdown] = useState(25);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // On mount: ensure an active challenge exists if not passed in query
  useEffect(() => {
    let isMounted = true;
    if (searchParams.get('devOtp')) {
      return;
    }

    const initChallenge = async () => {
      try {
        const res = await api.post(`/v1/patients/${encodeURIComponent(pid)}/challenge-otp`);
        if (isMounted) {
          const fetchedOtp = res.data?.devOtp || res.devOtp || '482731';
          setLiveOtp(fetchedOtp);
          setDigits(fetchedOtp.split(''));
          setCountdown(res.data?.resendCooldownSeconds || 25);
        }
      } catch (err) {
        if (isMounted && err.cooldownRemainingSeconds) {
          setCountdown(err.cooldownRemainingSeconds);
        }
      }
    };

    initChallenge();
    return () => {
      isMounted = false;
    };
  }, [pid, searchParams]);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (index, value) => {
    setError('');
    const cleanValue = value.replace(/[^0-9]/g, '');

    if (cleanValue.length > 1) {
      const nextDigits = [...digits];
      for (let i = 0; i < cleanValue.length && index + i < 6; i++) {
        nextDigits[index + i] = cleanValue[i];
      }
      setDigits(nextDigits);
      const nextIdx = Math.min(5, index + cleanValue.length);
      document.getElementById(`otp-input-${nextIdx}`)?.focus();

      if (nextDigits.every((d) => d !== '')) {
        executeVerify(nextDigits.join(''));
      }
      return;
    }

    const updated = [...digits];
    updated[index] = cleanValue;
    setDigits(updated);

    if (cleanValue && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }

    if (cleanValue && index === 5 && updated.every((d) => d !== '')) {
      executeVerify(updated.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const executeVerify = async (otpValue) => {
    setError('');
    setResendNotice('');
    setVerifying(true);

    try {
      const response = await api.post(`/v1/patients/${encodeURIComponent(pid)}/verify-otp`, {
        otp: otpValue,
      });

      const grantData = response.grant || response.data?.grant;
      if (grantData?.grantToken) {
        sessionStorage.setItem(`hms_grant_${pid}`, grantData.grantToken);
      }

      setSuccess(true);
      setTimeout(() => {
        // Step 4 of Workflow: Patient Medical History
        navigate(`/patients/${encodeURIComponent(pid)}/history`);
      }, 400);
    } catch (err) {
      const remainingMsg =
        err.remainingAttempts !== undefined ? ` (${err.remainingAttempts} attempts remaining)` : '';
      setError((err.message || 'Verification failed. Please check the OTP code.') + remainingMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const otpValue = digits.join('');
    if (otpValue.length < 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }
    executeVerify(otpValue);
  };

  const handleResend = async () => {
    setError('');
    setResendNotice('');
    setResending(true);

    try {
      const res = await api.post(`/v1/patients/${encodeURIComponent(pid)}/challenge-otp`);
      const newOtp = res.data?.devOtp || res.devOtp || '482731';
      setLiveOtp(newOtp);
      setDigits(newOtp.split(''));
      setCountdown(res.data?.resendCooldownSeconds || 25);
      setResendNotice(`Fresh OTP dispatched to patient mobile: ${newOtp}`);
    } catch (err) {
      if (err.cooldownRemainingSeconds) {
        setCountdown(err.cooldownRemainingSeconds);
      }
      setError(err.message || 'Failed to dispatch new OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* =========================================================================
          TOP HEADER & BREADCRUMBS (Matching 03-patient-otp-verification.png)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-[#0B2450] tracking-tight">
            Patient OTP Verification
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Verify with the patient to access their medical records
          </p>
        </div>

        {/* Breadcrumb path */}
        <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 self-start sm:self-auto">
          <Link to="/dashboard" className="hover:text-blue-600 transition">
            Home
          </Link>
          <span>&gt;</span>
          <Link to="/patients/search" className="hover:text-blue-600 transition">
            Search Patient
          </Link>
          <span>&gt;</span>
          <span className="text-[#0B2450] font-bold">Verify OTP</span>
        </div>
      </div>

      {/* =========================================================================
          STEPPER PROGRESS CARD (Matching 03-patient-otp-verification.png)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto gap-4">
          {/* Step 1: Doctor Login (Completed) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B2450] leading-tight">1. Doctor Login</p>
              <p className="text-[11px] text-[#059669] font-medium leading-tight">Completed</p>
            </div>
          </div>

          <div className="w-12 sm:w-16 h-0.5 bg-[#059669] shrink-0"></div>

          {/* Step 2: Search Patient (Completed) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B2450] leading-tight">2. Search Patient</p>
              <p className="text-[11px] text-[#059669] font-medium leading-tight">Completed</p>
            </div>
          </div>

          <div className="w-12 sm:w-16 h-0.5 bg-[#059669] shrink-0"></div>

          {/* Step 3: Patient OTP (Active) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1769E8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-blue-500/25 ring-4 ring-blue-100">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-[#1769E8] leading-tight">3. Patient OTP</p>
              <p className="text-[11px] text-[#1769E8] font-medium leading-tight">Verify code</p>
            </div>
          </div>

          <div className="w-12 sm:w-16 h-0.5 border-t-2 border-dashed border-slate-300 shrink-0"></div>

          {/* Step 4: Medical History */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 leading-tight">4. Medical History</p>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">Access records</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN VIEW (Matching 03-patient-otp-verification.png)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN: VERIFY PATIENT OTP FORM (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200/80 shadow-xs p-6 sm:p-9 space-y-6">
          {/* Header with Purple Shield */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EFE7FF] text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#D8C5FD] shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold font-heading text-[#0B2450] tracking-tight">
                Verify Patient OTP
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter the code sent to the patient's registered mobile number.
              </p>
            </div>
          </div>

          {/* Phone target information card */}
          <div className="p-4 rounded-2xl bg-[#F0F6FD] border border-[#D9EBFF] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1769E8] border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-5 h-5 text-[#1769E8]" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                OTP sent to
              </p>
              <p className="text-sm font-bold text-[#0B2450] font-mono mt-0.5">{maskedPhone}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                A 6-digit verification code has been sent to the patient's registered mobile number.
              </p>
            </div>
          </div>

          {/* Alerts */}
          {resendNotice && (
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-medium">
              {resendNotice}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] text-xs text-[#059669] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>OTP verified! Patient access grant issued. Opening records...</span>
            </div>
          )}

          {/* OTP Input Form */}
          <form onSubmit={handleVerifySubmit} className="space-y-6 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#0B2450] uppercase tracking-wider mb-3">
                Enter 6-digit OTP
              </label>

              {/* 6 Digit Inputs */}
              <div className="flex justify-between gap-2 sm:gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e.key)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50/70 text-[#0B2450] focus:outline-none focus:border-[#1769E8] focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs"
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-4 px-6 bg-[#1769E8] hover:bg-[#0F57C8] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{verifying ? 'Verifying with Server...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Countdown / Resend */}
            <div className="text-center text-xs text-slate-500">
              {countdown > 0 ? (
                <span>
                  Resend OTP in <strong className="text-[#1769E8]">00:{countdown < 10 ? `0${countdown}` : countdown}</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="text-[#1769E8] hover:underline font-bold inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Sending...' : 'Resend OTP Code'}</span>
                </button>
              )}
            </div>

            {/* Back link */}
            <div className="pt-2 text-left">
              <Link
                to="/patients/search"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0B2450] font-bold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Patient Search</span>
              </Link>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: SMARTPHONE GRAPHIC & INFORMATION CARDS (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Top Card: Phone Graphic with Live OTP (Matching 03-patient-otp-verification.png) */}
          <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-xs p-6 text-center space-y-4">
            {/* Phone Representation Card */}
            <div className="max-w-[260px] mx-auto bg-gradient-to-b from-blue-50 to-slate-50 rounded-[32px] p-4 border-2 border-slate-300 shadow-md text-center space-y-3">
              {/* Notch */}
              <div className="w-16 h-3 bg-slate-300 rounded-full mx-auto"></div>

              {/* Message graphic */}
              <div className="w-9 h-9 rounded-xl bg-[#1769E8] text-white flex items-center justify-center mx-auto shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500">Your OTP Code</p>
                <div className="flex justify-center gap-1.5 mt-2">
                  {liveOtp.split('').map((d, i) => (
                    <span
                      key={i}
                      className="w-7 h-9 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-sm text-[#0B2450] shadow-2xs"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status indicator inside phone */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF7EC] text-[#059669] text-[10px] font-bold border border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                <span>SMS Dispatched</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#0B2450]">Secure Access</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Patient authorization keeps their medical information private and secure.
              </p>
            </div>
          </div>

          {/* Middle Card: Privacy Protected (Mint #DDF7EC) */}
          <div className="p-5 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#059669] leading-tight">
                Your patient's privacy is protected
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Medical history, reports and prescriptions will remain private until the patient
                verifies the OTP. This ensures secure and consent-based access to their records.
              </p>
            </div>
          </div>

          {/* Bottom Card: Didn't receive the code? (Lavender #EFE7FF) */}
          <div className="p-5 rounded-2xl bg-[#EFE7FF] border border-[#D8C5FD] flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#7C3AED] leading-tight">
                Didn't receive the code?
              </h4>
              <ul className="text-xs text-slate-600 mt-1.5 space-y-1 list-disc list-inside leading-relaxed">
                <li>Ask the patient to check their SMS inbox (and spam folder).</li>
                <li>Make sure the registered mobile number is correct.</li>
                <li>You can resend the OTP after the countdown timer ends.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
