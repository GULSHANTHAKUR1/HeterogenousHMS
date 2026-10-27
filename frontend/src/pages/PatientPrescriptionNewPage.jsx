import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pill, Plus, Trash2, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import PageTitle from '../components/PageTitle';

export default function PatientPrescriptionNewPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const navigate = useNavigate();

  const [diagnosis, setDiagnosis] = useState('Iron Deficiency Anemia (Mild)');
  const [instructions, setInstructions] = useState('Take medications with meals. Avoid calcium supplements or milk products within 1 hour of iron.');
  const [medications, setMedications] = useState([
    { name: 'Ferrous Ascorbate', dosage: '100 mg', frequency: 'Once daily after dinner', duration: '30 days' },
    { name: 'Vitamin C (Ascorbic Acid)', dosage: '500 mg', frequency: 'Once daily in morning', duration: '30 days' },
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: 'Once daily', duration: '7 days' },
    ]);
  };

  const handleRemoveMedication = (index) => {
    if (medications.length <= 1) return;
    setMedications(medications.filter((_, idx) => idx !== index));
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!diagnosis.trim()) {
      setError('Please provide a clinical diagnosis.');
      return;
    }

    const hasEmptyDrugs = medications.some((m) => !m.name.trim() || !m.dosage.trim());
    if (hasEmptyDrugs) {
      setError('Please ensure all drug names and dosages are entered.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/v1/patients/${encodeURIComponent(pid)}/prescriptions`, {
        diagnosis: diagnosis.trim(),
        medications: medications.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions ? m.instructions.trim() : '',
        })),
        generalInstructions: instructions.trim(),
        status: 'Active',
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${encodeURIComponent(pid)}/prescriptions`);
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to issue prescription. Please check fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to={`/patients/${pid}/prescriptions`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Prescriptions
      </Link>

      <PageTitle
        title="Issue Digital Prescription"
        subtitle={`Create new pharmacological treatment regimen for ${pid}`}
        badge="Screen 6 of Workflow"
      />

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold font-heading text-navy-900">
                Prescription Successfully Issued!
              </h3>
              <p className="text-xs text-slate-500">
                Committed to patient's MongoDB record. Redirecting to Prescriptions list...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Diagnosis Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Clinical Diagnosis / Primary Indication
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Iron Deficiency Anemia, Type 2 Diabetes"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm font-semibold text-navy-900 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>

              {/* Dynamic Medications List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prescribed Medications ({medications.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Medication</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {medications.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Drug Name</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Ferrous Ascorbate"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-navy-900 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                          placeholder="100 mg"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-navy-900 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Frequency</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                          placeholder="Once daily"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                          placeholder="30 days"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-teal-700 font-semibold focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end sm:pt-4">
                        {medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition"
                            title="Remove Drug"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Special Instructions & Patient Advice
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Advise patient on dietary modifications and follow-up timeline..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
              >
                <Pill className="w-4 h-4" />
                <span>{saving ? 'Registering Prescription...' : 'Save & Issue Digital Prescription'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
