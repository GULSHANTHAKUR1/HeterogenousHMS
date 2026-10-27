import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Sparkles,
  Eye,
  FileDown,
  Lock,
  Pill,
  Loader2
} from 'lucide-react';
import PageTitle from '../components/PageTitle';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import api from '../services/api';

export default function PatientReportDetailPage() {
  const { patientId, reportId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const repId = reportId || 'REP-001';
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/v1/patients/${encodeURIComponent(pid)}/reports/${encodeURIComponent(repId)}`);
        setReport(response.data);
      } catch (err) {
        setError(err.message || 'Unable to retrieve report details.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [pid, repId]);

  const handleDownloadOriginal = async () => {
    setDownloading(true);
    try {
      const response = await api.get(
        `/v1/patients/${encodeURIComponent(pid)}/reports/${encodeURIComponent(repId)}/document`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response], { type: report?.mimeType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report?.originalFileName || `${repId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading medical diagnostic report & OCR extraction data..." />;
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <Link
          to={`/patients/${pid}/reports`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Reports List
        </Link>
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold font-heading text-navy-900">Failed to Load Report</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
          <button
            onClick={() => navigate(`/patients/${pid}/history`)}
            className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
          >
            Return to Patient History
          </button>
        </div>
      </div>
    );
  }

  const labResults = (report.extractedParameters || []).map((p) => ({
    test: p.testName || p.test || 'Laboratory Parameter',
    value: p.observedValue || p.value || '',
    unit: p.unit || '',
    normalRange: p.normalRange || p.reference_range || '',
    status: p.status || 'Normal',
    reviewStatus: p.reviewStatus || 'PENDING_CLINICIAN_REVIEW',
    extractionMethod: p.extractionMethod || 'pymupdf_embedded',
  }));

  const nlpFindings = report.nlpFindings || [];

  return (
    <div className="space-y-6">
      {/* Top back navigation and badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={`/patients/${pid}/reports`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Reports
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
            Report: {report.reportId}
          </span>
          <span className="text-xs font-mono font-bold bg-pastel-mint text-emerald-800 px-2.5 py-1 rounded-md border border-pastel-mint-border">
            Patient: {pid}
          </span>
        </div>
      </div>

      <PageTitle
        title="Report View (OCR + NLP)"
        subtitle="Side-by-side verification: Original uploaded medical sheet vs. automated clinical entity extraction"
        badge="Screen 5 of Workflow"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadOriginal}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-xs"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloading ? 'Downloading...' : 'Download Original'}</span>
            </button>
            <button
              onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm shadow-teal-700/20"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Issue Prescription</span>
            </button>
          </div>
        }
      />

      {/* DUAL-PANEL LAYOUT (Screen 5 of Approved Workflow) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT PANEL: Original Report (Uploaded) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between min-h-[580px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold font-heading text-navy-900">Original Report (Uploaded)</h2>
                <p className="text-xs text-slate-400">
                  {report.originalFileName} • {report.mimeType?.includes('pdf') ? 'Digital PDF' : 'Image Scan'}
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                Private Storage Asset
              </span>
            </div>

            {/* Document Mock Canvas reproducing the physical medical sheet */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-6 shadow-inner font-mono text-[11px] text-slate-700 space-y-3 relative overflow-hidden">
              <div className="border-b border-slate-300 pb-2 text-center">
                <p className="font-bold text-xs tracking-wider text-navy-900 font-heading">
                  METROPOLITAN CLINICAL LABORATORIES
                </p>
                <p className="text-[10px] text-slate-500 font-sans">
                  Heterogeneous HMS Diagnostic Pathology & Imaging
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 py-1 border-b border-slate-200">
                <div><strong>Patient ID:</strong> {report.patientId}</div>
                <div><strong>Category:</strong> {report.reportType}</div>
                <div><strong>Report Date:</strong> {new Date(report.reportDate).toLocaleDateString('en-GB')}</div>
                <div><strong>Uploaded By:</strong> {report.uploadedByDoctorId || 'Doctor'}</div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between font-bold text-[10px] text-navy-900 border-b border-slate-200 pb-1 uppercase tracking-wider">
                  <span>INVESTIGATION</span>
                  <span>OBSERVED VALUE</span>
                  <span>REFERENCE RANGE</span>
                </div>
                <div className="space-y-1.5 pt-2 text-[10px]">
                  {labResults.length === 0 ? (
                    <p className="text-center text-slate-400 py-4">No tabulated parameters detected.</p>
                  ) : (
                    labResults.map((param, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between p-1.5 rounded ${
                          param.status !== 'Normal' ? 'text-rose-700 font-bold bg-rose-50/70' : ''
                        }`}
                      >
                        <span>{param.test}</span>
                        <span>
                          {param.value} {param.unit} {param.status !== 'Normal' ? `*${param.status.toUpperCase()}*` : ''}
                        </span>
                        <span>{param.normalRange || 'Explicit'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {report.clinicianNotes && (
                <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-600 font-sans">
                  <strong>Clinician Notes:</strong> {report.clinicianNotes}
                </div>
              )}

              <div className="pt-4 text-[9px] text-slate-400 italic text-center font-sans border-t border-slate-200">
                Document Verified by Private Hospital EMR Service
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleDownloadOriginal}
              disabled={downloading}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Scanned Document</span>
            </button>
            <button
              onClick={() => navigate(`/patients/${pid}/reports/upload`)}
              className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition shadow-sm shadow-teal-700/20 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Another Report</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Extracted Information Table + Key Findings (NLP) */}
        <div className="space-y-6">
          {/* Extracted Information (Table) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-heading text-navy-900">Extracted Information (Table)</h2>
                <p className="text-xs text-slate-400">Structured parameters extracted via Python Tesseract OCR</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-pastel-mint text-emerald-800 rounded-lg border border-pastel-mint-border flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                OCR Normalized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Test</th>
                    <th className="px-6 py-3.5">Value</th>
                    <th className="px-6 py-3.5">Normal Range</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No parameters extracted for this report.
                      </td>
                    </tr>
                  ) : (
                    labResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-3.5 font-bold text-navy-900">{row.test}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-navy-900">
                          {row.value} {row.unit}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">{row.normalRange || '—'}</td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Findings (NLP) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pastel-purple text-purple-700 flex items-center justify-center border border-pastel-purple-border">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-heading text-navy-900">Key Findings (NLP)</h2>
                  <p className="text-xs text-slate-400">Natural language clinical entities and impressions</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Candidate Observation
              </span>
            </div>

            <div className="space-y-2.5">
              {nlpFindings.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No specific abnormal NLP impressions generated.</p>
              ) : (
                nlpFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-pastel-blue/60 border border-pastel-blue-border text-xs text-navy-900 flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                    <span className="font-medium text-slate-800">{finding}</span>
                  </div>
                ))
              )}
            </div>

            {/* Clinician Action CTA */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => navigate(`/patients/${pid}/prescriptions/new`)}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
              >
                <Pill className="w-4 h-4 text-teal-200" />
                <span>Issue Prescription Based on Findings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
