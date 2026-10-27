import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Save,
  RotateCcw,
  Pill,
  ExternalLink,
  Edit3
} from 'lucide-react';
import PageTitle from '../components/PageTitle';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function PatientReportUploadPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState('Complete Blood Count (CBC)');
  const [doctorNotes, setDoctorNotes] = useState('Patient presented with chronic fatigue; ordered complete hematology check.');

  // Stepped upload lifecycle: 'IDLE' | 'UPLOADING' | 'PROCESSING_OCR' | 'REVIEW' | 'SAVED'
  const [stage, setStage] = useState('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [uploadedReport, setUploadedReport] = useState(null);
  const [savingReview, setSavingReview] = useState(false);

  // Extracted preview data for doctor review
  const [extractedReview, setExtractedReview] = useState([]);
  const [nlpFindings, setNlpFindings] = useState([]);

  const handleFileChange = (e) => {
    setValidationError('');
    setApiError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

      if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
        setValidationError('Invalid file format. Please upload a PDF, PNG, or JPG document.');
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setValidationError('File exceeds the 15MB limit. Please compress the document before uploading.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleStartUpload = async (e) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');

    if (!selectedFile) {
      setValidationError('Please select or drop a medical report file.');
      return;
    }

    setStage('UPLOADING');
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('reportType', reportType);
    if (doctorNotes) {
      formData.append('clinicianNotes', doctorNotes);
    }

    try {
      setUploadProgress(45);
      // Real backend upload & dispatch to Python OCR microservice
      const response = await api.post(`/v1/patients/${encodeURIComponent(pid)}/reports/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 90) / progressEvent.total);
            setUploadProgress(Math.max(45, pct));
          }
        },
      });

      setUploadProgress(100);
      const reportData = response.data || response;
      setUploadedReport(reportData);

      // Map parameters for interactive doctor review
      const params = (reportData.extractedParameters || []).map((p, idx) => ({
        id: idx,
        test: p.testName || p.test || 'Diagnostic Parameter',
        value: p.observedValue || p.value || '',
        unit: p.unit || '',
        normalRange: p.normalRange || p.reference_range || '',
        status: p.status || p.abnormality_flag || 'Normal',
        reviewStatus: p.reviewStatus || 'PENDING_CLINICIAN_REVIEW',
      }));

      setExtractedReview(params);
      setNlpFindings(reportData.nlpFindings || []);
      setStage('REVIEW');
    } catch (err) {
      setApiError(err.message || 'Failed to upload and process report document.');
      setStage('IDLE');
    }
  };

  const handleParamChange = (index, field, value) => {
    const updated = [...extractedReview];
    updated[index][field] = value;
    // Mark as updated by clinician
    updated[index].reviewStatus = 'CONFIRMED_BY_CLINICIAN';
    setExtractedReview(updated);
  };

  const handleSaveToRecord = async () => {
    if (!uploadedReport?.reportId) return;
    setSavingReview(true);
    setApiError('');

    try {
      const payloadParams = extractedReview.map((p) => ({
        testName: p.test,
        observedValue: p.value,
        unit: p.unit,
        normalRange: p.normalRange,
        status: p.status,
        reviewStatus: 'CONFIRMED_BY_CLINICIAN',
      }));

      await api.patch(
        `/v1/patients/${encodeURIComponent(pid)}/reports/${encodeURIComponent(uploadedReport.reportId)}/review`,
        {
          extractedParameters: payloadParams,
          clinicianNotes: doctorNotes,
        }
      );

      setStage('SAVED');
    } catch (err) {
      setApiError(err.message || 'Failed to confirm reviewed report parameters.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleReset = () => {
    setStage('IDLE');
    setSelectedFile(null);
    setUploadProgress(0);
    setValidationError('');
    setApiError('');
    setUploadedReport(null);
  };

  return (
    <div className="space-y-6">
      <Link
        to={`/patients/${pid}/reports`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Reports List
      </Link>

      <PageTitle
        title="Upload Diagnostic Report"
        subtitle={`Submit lab document or radiology scan for automated OCR & NLP extraction (${pid})`}
        badge="Screen 6 of Workflow"
      />

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          {validationError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {apiError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD FORM */}
          {stage === 'IDLE' && (
            <form onSubmit={handleStartUpload} className="space-y-6">
              {/* Report Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Diagnostic Report Category
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC) Panel</option>
                  <option value="Clinical Biochemistry / Liver Profile">Clinical Biochemistry / Liver Profile</option>
                  <option value="Renal Function & Electrolytes">Renal Function & Electrolytes</option>
                  <option value="Lipid & Blood Glucose Profile">Lipid & Blood Glucose Profile</option>
                  <option value="Radiology / Chest X-Ray">Radiology / Chest X-Ray</option>
                  <option value="Routine Urinalysis">Routine Urinalysis Panel</option>
                </select>
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Document (PDF, PNG, JPG - Max 15MB)
                </label>
                <div
                  onClick={() => document.getElementById('report-file-input').click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition ${
                    selectedFile
                      ? 'border-teal-400 bg-teal-50/40'
                      : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    id="report-file-input"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-pastel-blue text-blue-600 flex items-center justify-center mx-auto mb-3 border border-pastel-blue-border">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-[11px] text-teal-700 font-mono mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for OCR analysis
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Click or drag medical sheet to upload
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Encrypted PDFs rejected • Tesseract OCR & spaCy NLP automatically applied
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinician Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Clinician Observational Notes
                </label>
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Clinical indication or preliminary physician notes..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-teal-200" />
                <span>Upload & Extract with Python OCR Service</span>
              </button>
            </form>
          )}

          {/* STEP 2: UPLOADING & PROCESSING */}
          {stage === 'UPLOADING' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-200">
                <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
              </div>
              <h3 className="text-base font-bold font-heading text-navy-900">
                Uploading Document to Private Storage...
              </h3>
              <p className="text-xs text-slate-500">
                Streaming {selectedFile?.name} to backend and invoking Python Tesseract OCR & NLP
              </p>

              <div className="max-w-md mx-auto w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-xs font-mono font-bold text-teal-700">{uploadProgress}%</span>
            </div>
          )}

          {/* STEP 3: EXTRACTED DATA REVIEW BEFORE SAVING */}
          {stage === 'REVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold font-heading text-navy-900 flex items-center gap-2">
                    <span>Review Extracted Parameters</span>
                    <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                      {uploadedReport?.reportId}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify and correct any uncertain values before confirming official clinical record
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-pastel-mint text-emerald-800 rounded-lg border border-pastel-mint-border flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  OCR Digitization Complete
                </span>
              </div>

              {/* Clinical findings alert */}
              {nlpFindings.length > 0 && (
                <div className="p-4 rounded-2xl bg-pastel-blue/60 border border-pastel-blue-border text-xs text-navy-900 space-y-1">
                  <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Automated Clinical NLP Impressions:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                    {nlpFindings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted table preview with inline editing */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Parsed Value</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Reference Range</th>
                      <th className="px-4 py-3">Candidate Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedReview.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No specific laboratory parameters extracted. Check original document view.
                        </td>
                      </tr>
                    ) : (
                      extractedReview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-navy-900">
                            <input
                              type="text"
                              value={item.test}
                              onChange={(e) => handleParamChange(idx, 'test', e.target.value)}
                              className="w-full bg-transparent font-bold text-navy-900 border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-navy-900">
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-slate-100 font-mono font-bold text-navy-900 border border-slate-200 focus:bg-white focus:border-teal-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                              placeholder="unit"
                              className="w-16 px-1.5 py-1 rounded bg-transparent text-slate-600 border border-transparent hover:border-slate-200 focus:bg-white focus:border-teal-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <input
                              type="text"
                              value={item.normalRange}
                              onChange={(e) => handleParamChange(idx, 'normalRange', e.target.value)}
                              placeholder="e.g. 13.0 - 17.0"
                              className="w-28 px-1.5 py-1 rounded bg-transparent text-slate-600 border border-transparent hover:border-slate-200 focus:bg-white focus:border-teal-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.status}
                              onChange={(e) => handleParamChange(idx, 'status', e.target.value)}
                              className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Low">Low</option>
                              <option value="High">High</option>
                              <option value="Abnormal">Abnormal</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard & Re-upload</span>
                </button>
                <button
                  type="button"
                  disabled={savingReview}
                  onClick={handleSaveToRecord}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs transition shadow-sm shadow-teal-700/20 inline-flex items-center justify-center gap-1.5"
                >
                  {savingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Confirm & Save to Record</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SAVED NOTIFICATION & CLINICAL ACTIONS */}
          {stage === 'SAVED' && (
            <div className="py-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-navy-900">
                  Report Reviewed & Committed to Record!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Report <span className="font-mono font-bold text-teal-700">{uploadedReport?.reportId}</span> is now permanently recorded under {pid}.
                </p>
              </div>

              {/* Next Steps Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => navigate(`/patients/${pid}/reports/${uploadedReport?.reportId || 'REP-001'}`)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition inline-flex items-center justify-center gap-2 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Dual-Panel Report View</span>
                </button>

                <button
                  onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm shadow-teal-700/20 inline-flex items-center justify-center gap-2"
                >
                  <Pill className="w-3.5 h-3.5 text-teal-200" />
                  <span>Issue New Prescription</span>
                </button>

                <button
                  onClick={() => navigate(`/patients/${pid}/history`)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Return to Patient History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
