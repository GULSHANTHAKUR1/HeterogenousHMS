import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Smartphone,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Copy,
  Wifi,
  Battery,
  Signal,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';

export default function PatientVerifyPage() {
  const [searchParams] = useSearchParams();
  const pid = searchParams.get('pid') || 'PID-2026-1234';
  const maskedPhone = searchParams.get('maskedPhone') || '+91 98765-XXXXX';

  const paramOtp = searchParams.get('devOtp') || '482731';

  // Live real-time OTP state
  const [liveOtp, setLiveOtp] = useState(paramOtp);
  const [digits, setDigits] = useState(paramOtp.split(''));
  const [countdown, setCountdown] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // On mount: ensure an active challenge exists if not already passed
  useEffect(() => {
    let isMounted = true;
    if (searchParams.get('devOtp')) {
      return; // Already initialized from PatientSearchPage
    }

    const initChallenge = async () => {
      try {
        const res = await api.post(`/v1/patients/${encodeURIComponent(pid)}/challenge-otp`);
        if (isMounted) {
          const fetchedOtp = res.data?.devOtp || res.devOtp || '482731';
          setLiveOtp(fetchedOtp);
          setDigits(fetchedOtp.split(''));
          setCountdown(res.data?.resendCooldownSeconds || 60);
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

  // Real-time countdown timer for resend
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

      // If all 6 digits filled, trigger auto-verify
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

    // Auto-verify when user enters 6th digit
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
        // Step 4 of Infographic: Go to Patient Medical History Dashboard
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
      setError('Please enter all 6 digits of the OTP verification code.');
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
      setCountdown(res.data?.resendCooldownSeconds || 60);
      setResendNotice(`Fresh OTP dispatched to patient: ${newOtp}`);
    } catch (err) {
      if (err.cooldownRemainingSeconds) {
        setCountdown(err.cooldownRemainingSeconds);
      }
      setError(err.message || 'Failed to dispatch new OTP.');
    } finally {
      setResending(false);
    }
  };

  const handleAutoFill = () => {
    setDigits(liveOtp.split(''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    executeVerify(liveOtp);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/patients/search"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Patient Search
        </Link>

        {/* 2-Column Workflow: Exactly Recreating Screen 3 from the Approved Infographic */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* LEFT COLUMN: Smartphone Mockup Showing Real-Time Patient OTP */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[280px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl shadow-blue-900/20 border-4 border-slate-700/60 relative">
              {/* Speaker / Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div>
              </div>

              {/* Screen Area */}
              <div className="bg-slate-950 rounded-[34px] p-4 text-white min-h-[460px] flex flex-col justify-between border border-slate-800">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                  <span className="font-semibold text-white">09:41</span>
                  <div className="flex items-center gap-1.5">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                {/* Simulated SMS Alert Bubble (Exact design from Infographic) */}
                <div className="my-auto space-y-4">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-300">Messages • Now</p>
                      <p className="text-[11px] font-semibold text-white">Hospital HMS</p>
                    </div>
                  </div>

                  {/* SMS Bubble */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        Patient SMS
                      </span>
                      <span className="text-[10px] text-slate-400">Just Now</span>
                    </div>

                    <div className="text-center py-2">
                      <p className="text-[11px] text-slate-300">Your OTP is</p>
                      <div className="mt-1 text-3xl font-extrabold font-mono tracking-widest text-emerald-400 bg-emerald-950/40 py-2.5 px-3 rounded-2xl border border-emerald-500/30">
                        {liveOtp}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                      Share this code with your attending doctor to authorize clinical history
                      access. Valid for 5 minutes.
                    </p>
                  </div>
                </div>

                {/* Patient Share Action Button */}
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'OTP Applied!' : 'Share OTP with Doctor'}</span>
                </button>
              </div>

              {/* Home indicator bar */}
              <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-2"></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium">
              Simulated Patient Phone Mockup
            </p>
          </div>

          {/* RIGHT COLUMN: Doctor's Verification Form (Screen 3 of Infographic) */}
          <div className="md:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8 text-center">
              {/* Smartphone graphic representation */}
              <div className="relative w-16 h-16 bg-pastel-blue text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 border border-pastel-blue-border shadow-xs">
                <Smartphone className="w-8 h-8 text-blue-600" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"></span>
              </div>

              <h2 className="text-2xl font-bold font-heading text-navy-900 tracking-tight">
                Verify Patient OTP
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
                An OTP has been sent to the patient's registered mobile number{' '}
                <span className="font-semibold text-slate-800">{maskedPhone}</span>. The patient
                shares the OTP with the doctor.
              </p>

              {resendNotice && (
                <div className="mt-4 p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-medium">
                  {resendNotice}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>OTP Verified! Patient grant issued. Loading medical history...</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="mt-7 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    Enter OTP
                  </label>
                  {/* 6-Digit input boxes */}
                  <div className="flex justify-center gap-2 sm:gap-2.5">
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
                        className="w-11 h-14 text-center text-2xl font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50/70 text-navy-900 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 active:scale-98"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{verifying ? 'Verifying with Server...' : 'Verify'}</span>
                </button>

                <div className="text-xs text-slate-400">
                  {countdown > 0 ? (
                    <span className="font-medium text-slate-500">
                      Resend OTP (00:{countdown < 10 ? `0${countdown}` : countdown})
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResend}
                      className="text-teal-600 hover:text-teal-700 font-semibold underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>{resending ? 'Dispatching...' : 'Resend OTP'}</span>
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Patient-Authorized Consent • Cryptographic Session Grant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
