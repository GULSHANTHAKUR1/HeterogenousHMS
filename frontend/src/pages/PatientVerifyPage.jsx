import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Smartphone, CheckCircle, ArrowLeft, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function PatientVerifyPage() {
  const [searchParams] = useSearchParams();
  const pid = searchParams.get('pid') || 'PID-2026-1234';
  const maskedPhone = searchParams.get('maskedPhone') || '+91 98765-XXXXX';

  // Infographic exact OTP: 4 8 2 7 3 1
  const [digits, setDigits] = useState(['4', '8', '2', '7', '3', '1']);
  const [countdown, setCountdown] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Countdown timer for resend cooldown
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
      return;
    }

    const updated = [...digits];
    updated[index] = cleanValue;
    setDigits(updated);

    if (cleanValue && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResendNotice('');

    const otpValue = digits.join('');
    if (otpValue.length < 6) {
      setError('Please enter all 6 digits of the OTP verification code.');
      return;
    }

    setVerifying(true);
    try {
      // Real backend verification
      const response = await api.post(`/v1/patients/${encodeURIComponent(pid)}/verify-otp`, {
        otp: otpValue,
      });

      const grantData = response.grant || response.data?.grant;
      if (grantData?.grantToken) {
        // Store grant token for patient clinical session
        sessionStorage.setItem(`hms_grant_${pid}`, grantData.grantToken);
      }

      setSuccess(true);
      setTimeout(() => {
        // Navigate to Step 4 (Patient Medical History Dashboard)
        navigate(`/patients/${encodeURIComponent(pid)}/history`);
      }, 500);
    } catch (err) {
      const remainingMsg = err.remainingAttempts !== undefined ? ` (${err.remainingAttempts} attempts remaining)` : '';
      setError((err.message || 'Verification failed. Please check the OTP.') + remainingMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendNotice('');
    setResending(true);

    try {
      const res = await api.post(`/v1/patients/${encodeURIComponent(pid)}/challenge-otp`);
      setCountdown(res.data?.resendCooldownSeconds || 60);
      setResendNotice('Fresh verification code dispatched to patient mobile.');
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
    <div className="space-y-6">
      <div className="max-w-md mx-auto">
        <Link
          to="/patients/search"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Patient Search
        </Link>

        {/* OTP Card (Screen 3 from Infographic) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 text-center">
          {/* Smartphone graphic representation */}
          <div className="relative w-16 h-16 bg-pastel-blue text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 border border-pastel-blue-border shadow-xs">
            <Smartphone className="w-8 h-8 text-blue-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"></span>
          </div>

          <h2 className="text-xl font-bold font-heading text-navy-900 tracking-tight">
            Verify Patient OTP
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            OTP has been sent to patient's registered mobile number{' '}
            <span className="font-semibold text-slate-800">{maskedPhone}</span> for{' '}
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {pid}
            </span>
          </p>

          {/* Development Demonstration Notice */}
          <div className="mt-4 p-3 bg-pastel-mint border border-pastel-mint-border rounded-2xl inline-flex items-center gap-2 text-xs text-emerald-950">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Local Dev Code: <strong>"482731"</strong> (from approved infographic)
            </span>
          </div>

          {resendNotice && (
            <div className="mt-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-medium">
              {resendNotice}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Patient consent verified! Accessing medical record...</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-7 space-y-6">
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
                  className="w-11 h-14 text-center text-xl font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50/70 text-navy-900 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{verifying ? 'Verifying with Server...' : 'Verify'}</span>
            </button>

            <div className="text-xs text-slate-400">
              {countdown > 0 ? (
                <span>Resend OTP (00:{countdown < 10 ? `0${countdown}` : countdown})</span>
              ) : (
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="text-teal-600 hover:text-teal-700 font-semibold underline inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Dispatching...' : 'Resend OTP'}</span>
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Cryptographic Consent Verification • Patient Scoped Grant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
