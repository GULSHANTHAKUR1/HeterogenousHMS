import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Pill,
  ShieldCheck,
  Lock,
  X,
  FileUp,
  Info,
  ChevronRight,
  ClipboardList,
  Check
} from 'lucide-react';
import api from '../services/api';

export default function PatientReportUploadPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Default demo file selected to match Screen 06 visual state
  const [selectedFile, setSelectedFile] = useState({
    name: 'Lab_Report_BloodTest.pdf',
    size: 2.4 * 1024 * 1024,
    type: 'application/pdf'
  });
  const [realFileObject, setRealFileObject] = useState(null);
  const [reportType, setReportType] = useState('Complete Blood Count (CBC)');
  const [doctorNotes, setDoctorNotes] = useState('Patient presented with chronic fatigue; ordered hematology check.');

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'prescription'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(78);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
        setError('Please upload a valid PDF, PNG, or JPG file.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File exceeds 15MB limit.');
        return;
      }
      setSelectedFile(file);
      setRealFileObject(file);
      setUploadProgress(100);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setRealFileObject(file);
      setUploadProgress(100);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setRealFileObject(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop a medical report file.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      if (realFileObject) {
        const formData = new FormData();
        formData.append('document', realFileObject);
        formData.append('reportType', reportType);
        if (doctorNotes) {
          formData.append('clinicianNotes', doctorNotes);
        }

        const response = await api.post(`/v1/patients/${encodeURIComponent(pid)}/reports/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(pct);
            }
          }
        });

        const reportId = response.data?.reportId || response.reportId || 'REP-2026-001';
        navigate(`/patients/${pid}/reports/${reportId}`);
      } else {
        // Fallback for visual demo
        setTimeout(() => {
          setUploading(false);
          navigate(`/patients/${pid}/reports/REP-2026-001`);
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to process report document with OCR service.');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to={`/patients/${pid}/history`} className="hover:text-blue-600 transition">Medical History</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-mono font-semibold text-slate-700">{pid}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-navy-900">Add to Medical History</span>
      </div>

      {/* Main Header Matching Screen 06 */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
          <FileUp className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-navy-900 tracking-tight">
            Add to Medical History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload new reports or add prescriptions to the patient's medical record.
          </p>
        </div>
      </div>

      {/* Patient Summary Banner (Screen 06 Reference) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold font-heading text-lg shrink-0">
            R
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                {pid}
              </span>
              <h2 className="text-sm font-bold font-heading text-navy-900">
                Rahul Sharma
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Age: <strong>32</strong> &nbsp;|&nbsp; Gender: <strong>Male</strong> &nbsp;|&nbsp; Blood Group: <strong>B+</strong>
            </p>
          </div>
        </div>

        {/* Mint Authorization Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#DDF7EC] border border-[#A7F3D0] text-emerald-900 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Patient Authorization Verified • Valid for: <strong>24 hours</strong></span>
        </div>
      </div>

      {/* Top Tabs: Upload Medical Report vs Add Prescription */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'bg-[#0B2450] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Upload Medical Report</span>
        </button>

        <button
          onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-2"
        >
          <Pill className="w-4 h-4" />
          <span>Add Prescription</span>
        </button>
      </div>

      {/* 2-Column Layout Matching Screen 06 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Upload Medical Report (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <h2 className="text-sm font-bold font-heading text-navy-900">
              Upload Medical Report
            </h2>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70'
                  : 'border-slate-200 bg-[#FAFBFD] hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>

              <p className="text-xs font-bold text-navy-900 font-heading">
                Drag and drop your report here, or
              </p>
              
              <button
                type="button"
                className="mt-2.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs"
              >
                Select File
              </button>

              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  PDF
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  JPG
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  PNG
                </span>
                <span className="text-[11px] text-slate-400 ml-1">Up to 15MB</span>
              </div>
            </div>

            {/* File Selected / Uploading Progress Box (Matching Screen 06) */}
            {selectedFile && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-900 truncate max-w-[240px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>{uploadProgress}% Uploading... Please wait</span>
                    <span className="font-bold text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields: Report Type & Clinician Notes */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5 font-heading">
                  Report Type / Category
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                  <option value="Biochemistry & Liver Function">Biochemistry & Liver Function</option>
                  <option value="Lipid Profile & Glucose">Lipid Profile & Glucose Fasting</option>
                  <option value="Urine Routine & Microscopic">Urine Routine & Microscopic</option>
                  <option value="Chest X-Ray PA View">Chest X-Ray PA View</option>
                  <option value="Thyroid Profile (T3, T4, TSH)">Thyroid Profile (T3, T4, TSH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5 font-heading">
                  Clinician Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Add any specific clinical observations or symptoms..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Button: Upload & Analyze (Matching Screen 06) */}
            <button
              onClick={handleUploadAndAnalyze}
              disabled={uploading}
              className="w-full py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing OCR & NLP Entity Extraction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Upload & Analyze</span>
                </>
              )}
            </button>

            {/* Info Pill */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                Reports are analyzed using <strong>OCR (Tesseract)</strong> and <strong>NLP (spaCy)</strong> to extract structured clinical data.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Add a Prescription & Privacy (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Add a Prescription (Screen 06 Reference) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold font-heading text-navy-900">
                  Add a Prescription
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create digital prescription with medication, dosage, and instructions.
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#EFE7FF] border border-[#D8C5FD] text-purple-700 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-purple-700" />
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span>Drug name with auto-complete</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span>Dosage, frequency, and duration</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span>Direct sync with patient pharmacy record</span>
              </div>
            </div>

            {/* Solid Purple CTA Button: + Create Prescription */}
            <button
              onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
              className="w-full py-3 px-4 rounded-2xl bg-[#7C3AED] hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm shadow-purple-600/20 flex items-center justify-center gap-2"
            >
              <Pill className="w-4 h-4" />
              <span>+ Create Prescription</span>
            </button>
          </div>

          {/* Card 2: Patient Data is Private (#DDF7EC Mint) */}
          <div className="p-5 rounded-3xl bg-[#DDF7EC] border border-[#A7F3D0] space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold font-heading text-emerald-950">
                Patient Data is Private
              </h3>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium leading-relaxed pl-9">
              All uploaded medical records and issued prescriptions are encrypted and accessible only with explicit patient consent and authorized active session tokens.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
