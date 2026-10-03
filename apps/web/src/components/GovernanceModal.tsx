import React, { useState, useEffect } from 'react';
import { 
  X, 
  Scale, 
  ShieldAlert, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Info,
  Clock,
  UserCheck,
  Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectMetadata {
  project_name: string;
  project_owner: string;
  institution: string;
  advisor: string;
  public_contact: string;
  privacy_contact: string;
  security_contact: string;
  legal_contact: string;
  governance_notice: string;
}

interface PublishedClaim {
  claim_id: string;
  claim_text: string;
  claim_type: string;
  category: string;
  source_ids: string[];
  evidence_ids: string[];
  data_version: string;
  model_version: string;
  methodology_version: string;
  publication_status: string;
  version: number;
  correction_status: string;
  reviewer: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SourceAccessItem {
  source_id: string;
  source_name: string;
  organization: string;
  dataset: string;
  purpose: string;
  access_method: string;
  authentication: string;
  private_or_public: string;
  authorization_status: string;
  ingestion_action: string;
  license: string;
  redistribution_allowed: boolean;
  raw_storage_allowed: boolean;
  derived_output_allowed: boolean;
  update_frequency: string;
  coverage: string;
  current_status: string;
  notes: string;
}

export const GovernanceModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'governance' | 'disclaimer' | 'workflow' | 'source_matrix' | 'takedown' | 'claims'>('governance');
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [claims, setClaims] = useState<PublishedClaim[]>([]);
  const [sourceMatrix, setSourceMatrix] = useState<SourceAccessItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Takedown form state
  const [requestType, setRequestType] = useState('FACTUAL_CORRECTION');
  const [targetId, setTargetId] = useState('');
  const [targetType, setTargetType] = useState('CLAIM');
  const [requesterContact, setRequesterContact] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: string; request_id: string; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetch('/api/v1/governance/project-info').then(r => r.json()).catch(() => null),
        fetch('/api/v1/governance/claims').then(r => r.json()).catch(() => []),
        fetch('/api/v1/governance/source-access').then(r => r.json()).catch(() => [])
      ]).then(([meta, clms, srcs]) => {
        setMetadata(meta);
        setClaims(Array.isArray(clms) ? clms : []);
        setSourceMatrix(Array.isArray(srcs) ? srcs : []);
      }).finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmitTakedown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !requesterContact || !description) {
      setSubmitError('Please fill in all mandatory fields.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/v1/governance/takedown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          target_id: targetId,
          target_type: targetType,
          requester_contact: requesterContact,
          request_description: description
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Submission failed');
      }
      setSubmitResult(data);
      setTargetId('');
      setDescription('');
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting notice');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto glass-panel rounded-2xl shadow-2xl border border-slate-700/60 p-6 text-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-6 h-6 text-sky-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Project Governance, Safety & Public Disclaimer
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Evidence-based environmental risk intelligence • Strict legal-safety & privacy standards
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pb-2 border-b border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'governance'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Project Governance
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'disclaimer'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Public Disclaimer
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'workflow'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Publication Safety
          </button>
          <button
            onClick={() => setActiveTab('source_matrix')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'source_matrix'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Source Access Matrix ({sourceMatrix.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'claims'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Published Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab('takedown')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === 'takedown'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Notice & Takedown
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4 flex-1">
          
          {/* TAB 1: Governance */}
          {activeTab === 'governance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  Formal Governance Structure & Affiliations Policy
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  FloodTrace is an evidence-based environmental risk intelligence system.
                  Per our formal governance charter, FloodTrace does <strong>NOT</strong> claim university ownership,
                  research affiliation, government endorsement, or institutional sponsorship unless explicitly documented and authorized.
                </p>
                <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-sky-500/20 text-xs font-mono text-sky-300">
                  {metadata?.governance_notice || 'Loading governance policy...'}
                </div>
              </div>

              {/* Roles Table */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Designated Project Governance Roles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Project Name:</span>
                    <span className="font-semibold text-slate-200 font-mono">{metadata?.project_name || 'FloodTrace'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Project Owner / Lead:</span>
                    <span className="font-semibold text-amber-400/90 font-mono">{metadata?.project_owner || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Academic / Institutional Affiliation:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.institution || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Advisor / Faculty Oversight:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.advisor || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Public Communications Contact:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.public_contact || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Data Privacy Officer:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.privacy_contact || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Security Contact / Vulnerability Reporting:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.security_contact || 'NOT DESIGNATED'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">Legal Counsel / Governance Contact:</span>
                    <span className="font-semibold text-slate-400 font-mono">{metadata?.legal_contact || 'NOT DESIGNATED'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Public Disclaimer */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-900/90 border border-sky-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Official Public Methodology & Evidence Disclaimer
                  </h3>
                </div>
                <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
                  <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong>1. Separation of Categories:</strong> FloodTrace presents verified source records, measurements, derived geospatial analysis, model outputs, forecasts, and citizen observations as strictly separately labeled information.
                  </p>
                  <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong>2. Modeling vs Causation:</strong> Modeled risk or hydrological connectivity does not by itself establish contamination or causation.
                  </p>
                  <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong>3. Registry Non-Accusation Rule:</strong> Facility presence in this system does not imply wrongdoing or contamination.
                  </p>
                  <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <strong>4. Physical Measurement Mandate:</strong> Environmental contamination should be confirmed using appropriate official measurements or qualified laboratory evidence.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Core Operational Mandate
                </div>
                <p className="leading-relaxed">
                  FloodTrace is an evidence-based environmental/flood risk information system.
                  It may identify areas requiring monitoring or investigation.
                  It must <strong>NOT</strong> determine guilt, causation, illegal activity, or criminal responsibility.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Publication Workflow & Safety Rules */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {/* Publication Workflow Diagram */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Mandatory Multi-Stage Publication Lifecycle
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">DRAFT</span>
                  <span className="text-slate-500">➔</span>
                  <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/40">AUTO_VALIDATION</span>
                  <span className="text-slate-500">➔</span>
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">HUMAN_REVIEW</span>
                  <span className="text-slate-500">➔</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">APPROVED</span>
                  <span className="text-slate-500">➔</span>
                  <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40">PUBLISHED</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Terminal review states: <code className="text-rose-400">REJECTED</code>, <code className="text-amber-400">WITHDRAWN</code>, <code className="text-purple-400">CORRECTED</code>.
                  No sensitive claim may become public directly from AI or model output.
                </p>
              </div>

              {/* Terminology Guide */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                    <Check className="w-4 h-4" /> Standardized Objective Phrasing
                  </span>
                  <ul className="space-y-1 text-slate-300 text-xs list-disc list-inside">
                    <li>"Potential exposure area"</li>
                    <li>"Estimated source area"</li>
                    <li>"Modeled hydrological connectivity"</li>
                    <li>"Area requiring further investigation"</li>
                    <li>"Monitoring priority"</li>
                    <li>"Insufficient verified evidence"</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5 mb-2">
                    <X className="w-4 h-4" /> Strictly Prohibited Causal Phrasing
                  </span>
                  <ul className="space-y-1 text-slate-300 text-xs list-disc list-inside">
                    <li>"Confirmed polluter / source"</li>
                    <li>"Poisoned area / toxic dump"</li>
                    <li>"Illegal factory / criminal act"</li>
                    <li>"Facility caused contamination"</li>
                    <li>"Most dangerous / worst factory"</li>
                    <li>Arbitrary rankings without certified assays</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Published Claims */}
          {activeTab === 'claims' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Publicly Approved & Evidence-Bundled Claims
                </h3>
                <span className="text-xs text-slate-400">
                  Total published: {claims.length}
                </span>
              </div>

              {claims.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                  <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No claims currently published.
                  <p className="text-xs text-slate-500 mt-1">
                    All sensitive claims require human review and complete evidence bundles before publication.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {claims.map((c) => (
                    <div key={c.claim_id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            {c.category}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            v{c.version} {c.correction_status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          ID: {c.claim_id}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium mt-2 leading-relaxed">
                        {c.claim_text}
                      </p>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block">Sources:</span>
                          <span className="text-slate-300">{c.source_ids?.join(', ') || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Evidence IDs:</span>
                          <span className="text-slate-300">{c.evidence_ids?.join(', ') || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Reviewer:</span>
                          <span className="text-emerald-400">{c.reviewer || 'Designated Human Inspector'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Model/Method:</span>
                          <span className="text-slate-300">{c.methodology_version}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Source Access Matrix */}
          {activeTab === 'source_matrix' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-sky-400" />
                    Data Source Access Matrix & Production Verification (Sec. 5 & 50)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    FAIL-CLOSED VERIFIED
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <strong>Master Prompt Mandatory Rule:</strong> All external datasets ingested into production factual pipelines
                  MUST come through private, authenticated, or officially authorized channels (API key issued to project, institutional MOU).
                  Public open datasets without private credentials are strictly marked <strong className="text-amber-300">PUBLIC_ONLY</strong> and blocked from production factual ingestion.
                </p>
              </div>

              <div className="space-y-3">
                {sourceMatrix.map(s => {
                  const getAuthBadge = (st: string) => {
                    switch (st) {
                      case 'PRIVATE_AUTHORIZED':
                        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                      case 'PUBLIC_ONLY':
                        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                      case 'PRIVATE_PENDING':
                        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                      case 'ACCESS_REQUIRED':
                        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                      case 'UNAVAILABLE':
                        return 'bg-slate-700 text-slate-400 border-slate-600';
                      default:
                        return 'bg-slate-800 text-slate-300 border-slate-700';
                    }
                  };

                  const getActionBadge = (act: string) => {
                    switch (act) {
                      case 'ALLOW_PRODUCTION_INGESTION':
                        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      case 'BLOCK_PRODUCTION_INGESTION':
                        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      case 'DISCOVERY_AND_PLANNING_ONLY':
                        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      default:
                        return 'bg-slate-800 text-slate-400 border-slate-700';
                    }
                  };

                  return (
                    <div key={s.source_id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {s.source_name}
                            <span className="text-xs font-mono font-normal text-slate-400">({s.source_id})</span>
                          </div>
                          <div className="text-xs text-slate-400">{s.organization}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getAuthBadge(s.authorization_status)}`}>
                            {s.authorization_status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getActionBadge(s.ingestion_action)}`}>
                            {s.ingestion_action}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-xs">Dataset:</span>
                          <span>{s.dataset}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Access Method:</span>
                          <span className="font-mono text-xs">{s.access_method}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Authentication:</span>
                          <span className="text-slate-300">{s.authentication}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Storage / Derived:</span>
                          <span className="text-slate-300">
                            Raw: {s.raw_storage_allowed ? 'Allowed' : 'Restricted'} • Derived: {s.derived_output_allowed ? 'Allowed' : 'Restricted'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                        <strong className="text-slate-300">Audit Notes: </strong>
                        {s.notes}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: Notice & Takedown Form */}
          {activeTab === 'takedown' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <h3 className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Structured Notice & Takedown / Correction Request Gateway
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Submit a formal request for factual correction, data source challenge, privacy redaction, or security reporting.
                  <br />
                  <strong>Important Notice:</strong> Verified official government records (such as factory registry entries)
                  are <em>not automatically deleted</em> simply because a request is submitted; each notice is reviewed with formal due diligence.
                </p>
              </div>

              {submitResult ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    Request Successfully Recorded
                  </div>
                  <p className="text-slate-300 text-xs">
                    Reference ID: <strong className="font-mono text-emerald-300">{submitResult.request_id}</strong>
                  </p>
                  <p className="text-slate-300 text-xs mt-1">
                    {submitResult.message}
                  </p>
                  <button
                    onClick={() => setSubmitResult(null)}
                    className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition min-h-[38px]"
                  >
                    Submit Another Notice
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTakedown} className="space-y-3.5 text-xs sm:text-sm">
                  {submitError && (
                    <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1">
                        Request Type
                      </label>
                      <select
                        value={requestType}
                        onChange={e => setRequestType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 min-h-[40px]"
                      >
                        <option value="FACTUAL_CORRECTION">Factual Correction</option>
                        <option value="DATA_SOURCE_CHALLENGE">Data-Source Challenge</option>
                        <option value="PRIVACY_REQUEST">Privacy / Coordinate Redaction</option>
                        <option value="REMOVAL_REQUEST">Removal Request</option>
                        <option value="SECURITY_REPORT">Security / Vulnerability Report</option>
                        <option value="ABUSIVE_CONTENT">Abusive Content Report</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1">
                        Target Resource Type
                      </label>
                      <select
                        value={targetType}
                        onChange={e => setTargetType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 min-h-[40px]"
                      >
                        <option value="CLAIM">Published Claim (claim_id)</option>
                        <option value="REPORT">Citizen Report (report_id)</option>
                        <option value="FACILITY">Industrial Facility Record</option>
                        <option value="STATION">Monitoring Water Gauge</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1">
                        Target Record Identifier
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. clm_12345 or 3-101-1/38ปจ"
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 min-h-[40px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs font-semibold mb-1">
                        Requester Official Contact (Email)
                      </label>
                      <input
                        type="email"
                        placeholder="contact@organization.or.th"
                        value={requesterContact}
                        onChange={e => setRequesterContact(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 min-h-[40px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1">
                      Detailed Grounds & Supporting Evidence
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Please specify factual error, conflicting official document number, or privacy grounds..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition disabled:opacity-50 min-h-[40px]"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Submitting Notice...' : 'Submit Official Request'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>FloodTrace Evidence & Legal-Safety Charter (v2.0-Audit)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition min-h-[40px] flex items-center justify-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
