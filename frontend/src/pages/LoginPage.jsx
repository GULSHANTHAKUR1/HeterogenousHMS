import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  FileText,
  Pill,
  Shield,
  BarChart2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * Heterogeneous HMS Brand Logo:
 * Exact medical cross with central ECG pulse waveform from design reference.
 */
export function HmsBrandLogo({ className = 'w-10 h-10', iconOnly = false }) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 52 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Vertical Arm (Emerald Green) */}
          <rect x="20" y="4" width="12" height="44" rx="6" fill="#00A884" />
          {/* Horizontal Arm (Royal Blue) */}
          <rect x="4" y="20" width="44" height="12" rx="6" fill="#1769E8" />
          {/* Central Pulse ECG Line (White) */}
          <path
            d="M8 26H17L20.5 20L25 32L29.5 16L33 28L35.5 26H44"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!iconOnly && (
        <div className="text-left">
          <h2 className="text-lg font-bold font-heading text-[#0B2450] tracking-tight leading-none">
            Heterogeneous HMS
          </h2>
          <p className="text-[11px] font-semibold text-slate-500 tracking-normal mt-1 leading-none">
            Hospital Management System
          </p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const [emailOrId, setEmailOrId] = useState('doctor@hospital.com');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailOrId.trim() || !password.trim()) {
      setError('Please provide your doctor email or Doctor ID and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(emailOrId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F6FD] relative overflow-x-hidden flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Background Soft Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-0 w-[700px] h-[500px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none -z-0"></div>

      {/* =========================================================================
          TOP NAVBAR (Matching 01-doctor-login.png)
          ========================================================================= */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between relative z-20">
        {/* Brand Logo */}
        <HmsBrandLogo className="w-10 h-10" />

        {/* Center Navigation Links */}
        <div className="hidden md:flex items-center gap-9">
          <nav className="flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a href="#home" className="text-[#1769E8] relative py-1 border-b-2 border-[#1769E8]">
              Home
            </a>
            <a href="#about" className="text-slate-600 hover:text-[#1769E8] transition">
              About
            </a>
            <a href="#features" className="text-slate-600 hover:text-[#1769E8] transition">
              Features
            </a>
            <a href="#contact" className="text-slate-600 hover:text-[#1769E8] transition">
              Contact
            </a>
          </nav>
        </div>

        {/* Right Badge: Secure & Private */}
        <div className="flex items-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#DDF7EC] text-[#059669] border border-[#A7F3D0] text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Secure & Private</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN HERO & DOCTOR LOGIN SECTION (Matching 01-doctor-login.png)
          ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 lg:py-6 flex-1 flex flex-col justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
          {/* -----------------------------------------------------------------
              LEFT COLUMN: HERO CONTENT & 3D DOCTOR
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5F1FF] text-[#1769E8] font-bold text-xs tracking-wide mb-4 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1769E8]" />
                <span>Trusted by Healthcare Professionals</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl xl:text-[68px] font-extrabold font-heading text-[#0B2450] tracking-tight leading-[1.06]">
                Your care,
                <span className="text-[#1769E8] block">connected.</span>
              </h1>

              {/* Subtitle */}
              <h2 className="text-lg sm:text-xl font-bold text-[#0B2450] mt-3">
                Secure access to patient medical histories
              </h2>

              {/* Paragraph */}
              <p className="text-sm text-slate-600 font-normal mt-2.5 max-w-lg leading-relaxed">
                Heterogeneous HMS helps doctors access patient records securely with patient
                authorization, view reports, and manage prescriptions in one place.
              </p>
            </div>

            {/* Doctor Character & Medical Elements Visual Area */}
            <div className="relative my-4 flex items-center justify-center sm:justify-start">
              {/* Background circular glow */}
              <div className="absolute left-16 w-60 h-60 bg-gradient-to-tr from-teal-200/40 via-blue-200/30 to-purple-100/30 rounded-full blur-2xl -z-0"></div>

              {/* Floating Prescription Sheet graphic in background */}
              <div className="absolute right-12 top-2 hidden sm:block p-3 bg-white/80 border border-blue-100 rounded-2xl shadow-md w-28 text-left">
                <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs mb-2">
                  +
                </div>
                <div className="h-1.5 bg-blue-100 rounded-full w-full mb-1"></div>
                <div className="h-1.5 bg-blue-100 rounded-full w-3/4 mb-1"></div>
                <div className="h-1.5 bg-blue-100 rounded-full w-1/2"></div>
              </div>

              {/* Floating ECG wave graphic */}
              <div className="absolute right-6 bottom-10 hidden sm:block p-3 bg-white/70 border border-teal-100 rounded-2xl shadow-md">
                <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                  <path
                    d="M2 12H12L16 3L22 21L27 7L31 15L34 12H46"
                    stroke="#00A884"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Doctor 3D Avatar Image */}
              <div className="relative z-10 w-48 sm:w-56 drop-shadow-xl transition hover:scale-105 duration-300">
                <img
                  src="/doctor_hero.jpg"
                  alt="Doctor with clipboard"
                  className="w-full h-auto object-cover rounded-3xl"
                />
              </div>
            </div>

            {/* Bottom 4 Feature Cards (Exact 4-column row from 01-doctor-login.png) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* 1. Medical Reports */}
              <div className="p-3.5 rounded-2xl bg-[#EDF5FF] border border-[#D9EBFF] text-left shadow-2xs hover:bg-white hover:border-blue-300 transition">
                <div className="w-8 h-8 rounded-xl bg-[#1769E8] text-white flex items-center justify-center mb-2.5 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#0B2450] leading-tight">Medical Reports</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  View and manage patient reports
                </p>
              </div>

              {/* 2. Prescriptions */}
              <div className="p-3.5 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] text-left shadow-2xs hover:bg-white hover:border-emerald-300 transition">
                <div className="w-8 h-8 rounded-xl bg-[#059669] text-white flex items-center justify-center mb-2.5 shadow-xs">
                  <Pill className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#0B2450] leading-tight">Prescriptions</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Access and add prescriptions
                </p>
              </div>

              {/* 3. Patient Authorization */}
              <div className="p-3.5 rounded-2xl bg-[#EFE7FF] border border-[#D8C5FD] text-left shadow-2xs hover:bg-white hover:border-purple-300 transition">
                <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center mb-2.5 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#0B2450] leading-tight">Patient Authorization</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Secure OTP-based access
                </p>
              </div>

              {/* 4. Structured Data */}
              <div className="p-3.5 rounded-2xl bg-[#FFF4E5] border border-[#FED7AA] text-left shadow-2xs hover:bg-white hover:border-amber-300 transition">
                <div className="w-8 h-8 rounded-xl bg-[#EA580C] text-white flex items-center justify-center mb-2.5 shadow-xs">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#0B2450] leading-tight">Structured Data</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  OCR + NLP analysis of reports
                </p>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              RIGHT COLUMN: DOCTOR LOGIN CARD (Exact 01-doctor-login.png)
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[430px] bg-white rounded-[32px] shadow-2xl shadow-blue-950/10 border border-slate-100 p-8 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
              {/* Card Centered Brand Logo */}
              <div className="flex justify-center mb-2">
                <HmsBrandLogo className="w-12 h-12" />
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0B2450] tracking-tight mt-3">
                Doctor Login
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                Sign in to access the Heterogeneous HMS platform
              </p>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Field: Email or Doctor ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Email or Doctor ID
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      value={emailOrId}
                      onChange={(e) => setEmailOrId(e.target.value)}
                      placeholder="Enter your email or doctor ID"
                      required
                      autoComplete="username"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-[#1769E8] focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs font-medium"
                    />
                  </div>
                </div>

                {/* Field: Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-[#1769E8] focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-400 hover:text-slate-600 transition"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Row: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                        rememberMe
                          ? 'bg-[#1769E8] border-[#1769E8] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      alert('Password Reset Notice:\nFor security compliance, please contact your hospital clinical administrator.')
                    }
                    className="text-xs font-semibold text-[#1769E8] hover:underline transition"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Button: Sign in -> */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-[#1769E8] hover:bg-[#0F57C8] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Authenticating...' : 'Sign in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Divider: or */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400 font-medium">or</span>
                </div>
              </div>

              {/* Bottom Security Notice Box (Matching 01-doctor-login.png) */}
              <div className="bg-[#EDF5FF] border border-[#D9EBFF] rounded-2xl p-3.5 flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-[#0B2450] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Shield className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B2450] leading-tight">
                    Authorized healthcare professionals only
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    This system contains sensitive patient information. Access is restricted to verified doctors.
                  </p>
                </div>
              </div>

              {/* Quick Demo Helper Links */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <span>Demo Fill:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailOrId('doctor@hospital.com');
                    setPassword('Password123!');
                    setError('');
                  }}
                  className="text-[#1769E8] hover:underline font-semibold"
                >
                  doctor@hospital.com
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailOrId('DOC-108');
                    setPassword('Password123!');
                    setError('');
                  }}
                  className="text-[#1769E8] hover:underline font-semibold"
                >
                  DOC-108
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 text-center text-xs text-slate-400 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/40">
        <p>© 2026 Heterogeneous HMS • Multi-Modal Hospital Management System</p>
        <p className="text-[11px]">HIPAA & Consent-Compliant Patient Record Architecture</p>
      </footer>
    </div>
  );
}
