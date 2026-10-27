import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Activity, Plus, FileText, ArrowRight, ExternalLink, Calendar, Filter, Sparkles, Download, AlertCircle } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import api from '../services/api';

export default function PatientReportsPage() {
  const { patientId } = useParams();
  const pid = patientId || 'PID-2026-1234';
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/v1/patients/${encodeURIComponent(pid)}/reports`);
        setReportsList(response.data || []);
      } catch (err) {
        setError(err.message || 'Unable to retrieve diagnostic reports for patient.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [pid]);

  const filteredReports = filterStatus === 'ALL'
    ? reportsList
    : reportsList.filter((r) => r.status && r.status.toUpperCase() === filterStatus);

  if (loading) {
    return <LoadingState message="Retrieving authorized diagnostic reports..." />;
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Patient Diagnostic Reports"
        subtitle={`All scanned pathology files and radiology imaging digitized for ${pid}`}
        badge={`${reportsList.length} Reports on Record`}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              to={`/patients/${pid}/history`}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition"
            >
              Overview
            </Link>
            <button
              onClick={() => navigate(`/patients/${pid}/reports/upload`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm shadow-teal-700/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload New Report</span>
            </button>
          </div>
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
            Re-verify Consent OTP
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'ABNORMAL', 'NORMAL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                filterStatus === st
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Diagnostic Reports' : st}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Showing {filteredReports.length} documents
        </span>
      </div>

      {/* Reports Card Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-navy-900">No diagnostic reports match filter</p>
          <p className="text-xs text-slate-400">Upload a pathology report or radiology image to start analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredReports.map((report) => (
            <div
              key={report.id || report.reportId}
              onClick={() => navigate(`/patients/${pid}/reports/${report.id || report.reportId}`)}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-300 p-5 sm:p-6 transition cursor-pointer flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pastel-blue border border-pastel-blue-border text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-teal-700 block">
                        {report.id || report.reportId}
                      </span>
                      <h3 className="text-sm font-bold font-heading text-navy-900 group-hover:text-teal-700 transition">
                        {report.title || report.reportType}
                      </h3>
                    </div>
                  </div>
                  <StatusBadge status={report.status} />
                </div>

                <div className="p-3 bg-slate-50/80 rounded-2xl text-xs text-slate-600 border border-slate-100">
                  <p className="font-medium line-clamp-2">
                    {report.findingsSummary || (report.nlpFindings && report.nlpFindings.join(' • ')) || 'OCR analysis processed'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-[11px]">
                  <span>{report.date || new Date(report.reportDate).toLocaleDateString('en-GB')}</span>
                  <span>•</span>
                  <span>{report.fileSize || `${(report.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`}</span>
                </div>

                <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
