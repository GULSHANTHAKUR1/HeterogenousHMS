import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [emailOrId, setEmailOrId] = useState('doctor@hospital.com');
  const [password, setPassword] = useState('DoctorPass123!');
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
      // Real backend authentication
      await login(emailOrId, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmailOrId('doctor@hospital.com');
    setPassword('DoctorPass123!');
    setError('');
  };

  const handleFillDemoId = () => {
    setEmailOrId('DOC-108');
    setPassword('DoctorPass123!');
    setError('');
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Medical Icon Badge */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-blue-100 shadow-xs">
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-navy-900 tracking-tight">
          Heterogeneous HMS
        </h1>
        <p className="text-sm font-semibold text-blue-600 mt-1">Doctor Login</p>
        <p className="text-xs text-slate-400 mt-1">Hospital Management System • EMR Terminal</p>

        {/* Local demonstration banner */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-pastel-blue border border-pastel-blue-border rounded-full text-[11px] font-medium text-blue-800">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Fictional Demo Environment
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email or Doctor ID
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={emailOrId}
              onChange={(e) => setEmailOrId(e.target.value)}
              placeholder="doctor@hospital.com or DOC-108"
              required
              autoComplete="username"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-blue-600 hover:text-blue-700 font-semibold text-[11px]"
            >
              Demo Email
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleFillDemoId}
              className="text-blue-600 hover:text-blue-700 font-semibold text-[11px]"
            >
              Demo ID (DOC-108)
            </button>
          </div>
          <span className="text-slate-400 text-[11px]">Protected Session</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          <span>{submitting ? 'Authenticating with Server...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        <span>Medical EMR Protected Access • HttpOnly Session</span>
      </div>
    </div>
  );
}
