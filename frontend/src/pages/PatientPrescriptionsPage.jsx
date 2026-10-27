import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pill, Plus, ArrowLeft, Calendar, User, Clock, AlertCircle, FileText } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import LoadingState from '../components/LoadingState';
import api from '../services/api';

export default function PatientPrescriptionsPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrescriptions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/v1/patients/${encodeURIComponent(pid)}/prescriptions`);
        setPrescriptions(response.data || []);
      } catch (err) {
        setError(err.message || 'Unable to retrieve patient prescriptions.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [pid]);

  if (loading) {
    return <LoadingState message="Retrieving authorized patient prescriptions..." />;
  }

  return (
    <div className="space-y-6">
      <Link
        to={`/patients/${pid}/history`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Overview
      </Link>

      <PageTitle
        title="Patient Prescriptions"
        subtitle={`Official digital pharmacological records and active treatment plans for ${pid}`}
        badge={`${prescriptions.length} Records on File`}
        actions={
          <button
            onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm shadow-teal-700/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Prescription</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Link
            to={`/patients/verify?pid=${pid}`}
            className="px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg text-xs"
          >
            Renew Access Grant
          </Link>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Pill className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-navy-900">No Prescriptions on File</p>
          <p className="text-xs text-slate-400">Issue a new digital prescription following clinical review.</p>
          <button
            onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
            className="mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
          >
            Issue First Prescription
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {prescriptions.map((rx) => {
            const rxId = rx.id || rx.prescriptionId;
            const rxDate = rx.date || new Date(rx.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const doctorDisplay = rx.doctor || rx.doctorName || rx.doctorId || 'Physician';
            const meds = rx.medications || [];

            return (
              <div
                key={rxId}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-pastel-mint border border-pastel-mint-border text-emerald-800 flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-700">{rxId}</span>
                        <span className="text-xs font-bold font-heading text-navy-900">• {rx.diagnosis}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Prescribed by {doctorDisplay}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {rxDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
                      rx.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {rx.status || 'Active'}
                  </span>
                </div>

                {/* Structured Medications Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Medication Name</th>
                        <th className="px-4 py-3">Dosage</th>
                        <th className="px-4 py-3">Frequency / Regimen</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {meds.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-bold text-navy-900">{m.name}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-800 font-medium">{m.dosage}</td>
                          <td className="px-4 py-3.5 text-slate-600">{m.frequency}</td>
                          <td className="px-4 py-3.5 text-teal-700 font-semibold">{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Clinician Instructions Box on light pastel surface */}
                {(rx.instructions || rx.generalInstructions) && (
                  <div className="bg-pastel-blue border border-pastel-blue-border rounded-2xl p-4 text-xs text-blue-950">
                    <span className="font-bold mr-2">Physician Advice:</span>
                    <span className="text-blue-900/90">{rx.instructions || rx.generalInstructions}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
