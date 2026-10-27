import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  FileText,
  Users,
  Headphones,
  Check,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * Heterogeneous HMS Brand Logo:
 * Custom medical cross with ECG waveform traversing the center.
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
          <rect x="4" y="20" width="44" height="12" rx="6" fill="#1D68BD" />
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
          <h2 className="text-lg font-bold font-heading text-slate-900 tracking-tight leading-none">
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
    <div className="min-h-screen w-full bg-[#F3F9FD] relative overflow-x-hidden flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Background Decorative Soft Wave Curves & Glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-0 w-[700px] h-[500px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none -z-0"></div>

      {/* Decorative Wave at the Bottom */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full pointer-events-none -z-0 opacity-80"
        viewBox="0 0 1440 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160C240 240 480 260 720 200C960 140 1200 180 1440 220V280H0V160Z"
          fill="url(#wave-gradient)"
        />
        <defs>
          <linearGradient id="wave-gradient" x1="0" y1="0" x2="1440" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D5ECFD" stopOpacity="0.7" />
            <stop offset="0.5" stopColor="#E2F6F1" stopOpacity="0.8" />
            <stop offset="1" stopColor="#CBE6FD" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>

      {/* =========================================================================
          TOP NAVIGATION BAR (Matching screenshot exactly)
          ========================================================================= */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between relative z-20">
        {/* Brand Logo */}
        <HmsBrandLogo className="w-10 h-10" />

        {/* Navigation Links + Need Help Pill */}
        <div className="flex items-center gap-6 sm:gap-9">
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#home" className="hover:text-blue-600 transition">
              Home
            </a>
            <a href="#about" className="hover:text-blue-600 transition">
              About
            </a>
            <a href="#features" className="hover:text-blue-600 transition">
              Features
            </a>
            <a href="#contact" className="hover:text-blue-600 transition">
              Contact
            </a>
          </nav>

          {/* Need Help? Pill Button */}
          <button
            type="button"
            onClick={() => alert('Heterogeneous HMS Support Desk:\n• Email: support@hospital.local\n• Emergency Clinical Hotline: +91 1800-HMS-CARE')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 hover:bg-blue-100 text-blue-600 font-semibold text-xs border border-blue-200/70 shadow-xs transition active:scale-95"
          >
            <Headphones className="w-3.5 h-3.5 text-blue-600" />
            <span>Need Help?</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN HERO + DOCTOR LOGIN CARD (Exact 2-column layout from screenshot)
          ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-8 lg:py-10 flex-1 flex items-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center w-full">
          {/* -----------------------------------------------------------------
              LEFT COLUMN: HERO TEXT & 3 FEATURE CARDS & 3D DOCTOR
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-7 relative">
            {/* Top Pill Badge */}
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/60 text-blue-700 font-extrabold text-[11px] tracking-wider uppercase mb-5 shadow-xs">
              A SAFER, SMARTER HEALTHCARE EXPERIENCE
            </div>

            {/* Large Hero Title */}
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold font-heading text-slate-900 tracking-tight leading-[1.08]">
              Your care,
              <span className="text-[#1A62E8] block">connected.</span>
            </h1>

            {/* Hero Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 font-medium mt-4 mb-8 max-w-lg leading-relaxed">
              Secure access to patient medical histories
            </p>

            {/* Two sub-columns on desktop: Cards on left, 3D Doctor on right */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Stack of 3 Feature Cards */}
              <div className="sm:col-span-7 space-y-4 z-10">
                {/* Feature 1: Patient Privacy First */}
                <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-xs border border-slate-100 hover:border-emerald-200 hover:bg-white transition flex items-center gap-3.5 shadow-xs">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Patient Privacy First
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      Access only with patient authorization
                    </p>
                  </div>
                </div>

                {/* Feature 2: All Records in One Place */}
                <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-xs border border-slate-100 hover:border-purple-200 hover:bg-white transition flex items-center gap-3.5 shadow-xs">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 shrink-0 shadow-xs">
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      All Records in One Place
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      Reports, prescriptions and history
                    </p>
                  </div>
                </div>

                {/* Feature 3: Built for Healthcare Professionals */}
                <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-xs border border-slate-100 hover:border-blue-200 hover:bg-white transition flex items-center gap-3.5 shadow-xs">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0 shadow-xs">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Built for Healthcare Professionals
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      Simple, secure and efficient
                    </p>
                  </div>
                </div>
              </div>

              {/* 3D Doctor Character Graphic */}
              <div className="sm:col-span-5 relative flex justify-center items-end">
                {/* Background soft circular glow */}
                <div className="absolute w-52 h-52 bg-gradient-to-tr from-teal-200/50 to-blue-200/40 rounded-full blur-2xl -z-0"></div>

                {/* Doctor Image */}
                <div className="relative z-10 w-44 sm:w-52 max-w-full drop-shadow-xl transition hover:scale-105 duration-300">
                  <img
                    src="/doctor_hero.jpg"
                    alt="Doctor holding medical clipboard"
                    className="w-full h-auto object-cover rounded-3xl"
                  />
                </div>

                {/* Decorative floating ECG pulse element */}
                <div className="absolute -top-6 -right-2 hidden xl:block opacity-60">
                  <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
                    <path
                      d="M2 20H16L22 6L32 34L40 12L46 24L50 20H62"
                      stroke="#00A884"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              RIGHT COLUMN: DOCTOR LOGIN CARD (Exact design from screenshot)
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[430px] bg-white rounded-[32px] shadow-2xl shadow-blue-950/10 border border-slate-100 p-8 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
              {/* Card Centered Brand Logo */}
              <div className="flex justify-center mb-3">
                <HmsBrandLogo className="w-12 h-12" />
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight mt-2">
                Doctor Login
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                Sign in to access the system securely.
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
                    <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      value={emailOrId}
                      onChange={(e) => setEmailOrId(e.target.value)}
                      placeholder="Enter your email or doctor ID"
                      required
                      autoComplete="username"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs font-medium"
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
                      className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition shadow-2xs font-medium"
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
                          ? 'bg-blue-600 border-blue-600 text-white'
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
                      alert('Password Reset Notice:\nFor security compliance, please contact your hospital system administrator or clinical IT desk.')
                    }
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Button: Sign in -> */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-[#1A62E8] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
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

              {/* Bottom Security Notice Box (Matching screenshot) */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Shield className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Authorized healthcare professionals only
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    This system contains confidential patient information.
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
                  className="text-blue-600 hover:underline font-semibold"
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
                  className="text-blue-600 hover:underline font-semibold"
                >
                  DOC-108
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 text-center text-xs text-slate-400 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/40">
        <p>© 2026 Heterogeneous HMS • Multi-Modal Hospital Management System</p>
        <p className="text-[11px]">HIPAA & Consent-Compliant Patient Record Architecture</p>
      </footer>
    </div>
  );
}
