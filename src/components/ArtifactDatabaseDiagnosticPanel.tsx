import React, { useState, useEffect } from "react";
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronUp, 
  ChevronDown, 
  Terminal, 
  Layers, 
  ExternalLink, 
  X,
  Server,
  Activity
} from "lucide-react";
import { 
  fetchArtifacts, 
  getLastArtifactDiagnostic, 
  subscribeArtifactDiagnostic, 
  ArtifactFetchDiagnostic,
  FIRESTORE_DATABASE_ID,
  FIRESTORE_PROJECT_ID
} from "../lib/artifactService";
import { isFirestoreQuotaExceeded } from "../lib/firestoreCircuitBreaker";
import { soundManager } from "../lib/soundEffects";

interface ArtifactDatabaseDiagnosticPanelProps {
  onOpenStudio?: () => void;
}

export default function ArtifactDatabaseDiagnosticPanel({ onOpenStudio }: ArtifactDatabaseDiagnosticPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostic, setDiagnostic] = useState<ArtifactFetchDiagnostic | null>(() => getLastArtifactDiagnostic());
  const [isVerifying, setIsVerifying] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const unsub = subscribeArtifactDiagnostic((diag) => {
      setDiagnostic(diag);
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        setDiagnostic(e.detail);
      }
    };
    window.addEventListener("sym_artifact_diagnostic_updated", handleCustomEvent);

    return () => {
      unsub();
      window.removeEventListener("sym_artifact_diagnostic_updated", handleCustomEvent);
    };
  }, []);

  const handleRunLiveTest = async () => {
    setIsVerifying(true);
    soundManager.playClick(0.12);
    try {
      console.group("📡 [MANUAL DIAGNOSTIC] Forcing Live Firestore fetchArtifacts(true)...");
      const startTime = performance.now();
      const freshArtifacts = await fetchArtifacts(true);
      const elapsed = Math.round(performance.now() - startTime);
      console.log(`✅ Retrieved ${freshArtifacts.length} artifacts in ${elapsed}ms:`, freshArtifacts);
      console.table(freshArtifacts.map(a => ({
        id: a.id,
        code: a.artifactId,
        name: a.name,
        collection: a.collectionName,
        specimens: a.specimenIds?.length || 0,
        status: a.status
      })));
      console.groupEnd();
    } catch (err) {
      console.error("❌ Diagnostic query error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDumpToConsole = () => {
    soundManager.playClick(0.08);
    const current = diagnostic?.artifacts || [];
    console.group("🏛️ [SYMBOLIC DIAGNOSTIC DUMP] Current Artifacts in Memory & Database");
    console.log("Database ID:", FIRESTORE_DATABASE_ID);
    console.log("Project ID:", FIRESTORE_PROJECT_ID);
    console.log("Diagnostic Summary:", diagnostic);
    console.table(current.map(a => ({
      id: a.id,
      artifactId: a.artifactId,
      name: a.name,
      inscription: a.inscription,
      collection: a.collectionName,
      specimensCount: a.specimenIds?.length || 0,
      status: a.status
    })));
    console.log("Raw Artifacts Array:", current);
    console.groupEnd();

    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const quotaExceeded = isFirestoreQuotaExceeded() || Boolean(diagnostic?.isQuotaExceeded);
  const artifactCount = diagnostic?.count ?? diagnostic?.artifacts?.length ?? 0;
  const sourceLabel = diagnostic?.source === "firestore_live" 
    ? "FIRESTORE LIVE SNAPSHOT" 
    : diagnostic?.source === "in_memory_cache" 
    ? "IN-MEMORY CACHE (TTL)" 
    : diagnostic?.source === "local_storage" 
    ? "LOCAL STORAGE CACHE" 
    : "CANONICAL SEED FALLBACK";

  return (
    <div className="fixed bottom-3 left-3 z-[90] font-mono select-none">
      {/* Floating Mini Badge Indicator */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            soundManager.playClick(0.08);
            setIsOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-surface/95 backdrop-blur-md border-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:bg-brand-text hover:text-brand-bg transition-all cursor-pointer text-left group"
          title="Open Firestore & Artifact Diagnostic Panel"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${quotaExceeded ? "bg-amber-500 animate-pulse" : artifactCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-ping"}`} />
          <div className="flex flex-col leading-none">
            <span className="text-[9.5px] font-black uppercase tracking-wider">
              DB DIAGNOSTIC // {artifactCount} ARTIFACTS
            </span>
            <span className="text-[7.5px] opacity-70 uppercase tracking-widest -mt-0.5">
              {diagnostic?.source === "firestore_live" ? "LIVE SYNCED" : "VERIFIED"}
            </span>
          </div>
          <ChevronUp size={12} className="text-brand-accent group-hover:text-brand-bg shrink-0 ml-1" />
        </button>
      )}

      {/* Expanded Diagnostic Panel Modal / Drawer */}
      {isOpen && (
        <div className="w-[94vw] sm:w-[540px] max-w-[94vw] max-h-[85vh] bg-brand-bg border-3 border-brand-text shadow-[8px_8px_0px_#050505] flex flex-col overflow-hidden text-brand-text">
          {/* Header */}
          <div className="bg-brand-text text-brand-bg px-3.5 py-2.5 flex items-center justify-between border-b-2 border-brand-text shrink-0">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-brand-accent" />
              <span className="text-xs font-black uppercase tracking-widest text-brand-bg">
                FIRESTORE ARTIFACT DIAGNOSTIC PANEL
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.06);
                setIsOpen(false);
              }}
              className="p-1 hover:bg-brand-accent hover:text-white transition-colors cursor-pointer text-brand-bg"
              title="Close Diagnostic Panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto text-[11px] leading-relaxed">
            {/* Database Coordinates */}
            <div className="bg-brand-surface border border-brand-text p-2.5 space-y-1.5 shadow-[2px_2px_0px_#050505]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/60">
                  TARGET FIRESTORE DATABASE
                </span>
                <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 border ${quotaExceeded ? "bg-amber-100 text-amber-900 border-amber-600" : "bg-emerald-100 text-emerald-900 border-emerald-600"}`}>
                  {quotaExceeded ? "QUOTA CIRCUIT TRIPPED" : "HEALTHY // CONNECTED"}
                </span>
              </div>
              <div className="text-[10px] font-mono break-all font-bold">
                <strong className="text-brand-text/60">DB ID: </strong>
                <span className="text-brand-accent">{FIRESTORE_DATABASE_ID}</span>
              </div>
              <div className="text-[9.5px] font-mono text-brand-text/75 break-all">
                <strong className="text-brand-text/60">PROJECT: </strong>
                <span>{FIRESTORE_PROJECT_ID}</span>
              </div>
            </div>

            {/* Fetch Status & Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-brand-surface border border-brand-text p-2 space-y-1">
                <span className="text-[8.5px] font-black uppercase text-brand-text/60 block">
                  DATA SOURCE
                </span>
                <span className="font-black text-brand-text uppercase block truncate" title={sourceLabel}>
                  {sourceLabel}
                </span>
              </div>
              <div className="bg-brand-surface border border-brand-text p-2 space-y-1">
                <span className="text-[8.5px] font-black uppercase text-brand-text/60 block">
                  QUERY LATENCY
                </span>
                <span className="font-black text-brand-text uppercase block">
                  {diagnostic?.durationMs !== undefined ? `${diagnostic.durationMs}ms` : "CACHED"}
                </span>
              </div>
            </div>

            {/* Error Message Notice if any */}
            {diagnostic?.error && (
              <div className="bg-amber-50 border-2 border-amber-600 p-2.5 text-[10px] text-amber-900 font-bold space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-700 shrink-0" />
                  <span className="font-black uppercase tracking-wider">DIAGNOSTIC NOTICE:</span>
                </div>
                <p className="font-mono">{diagnostic.error}</p>
              </div>
            )}

            {/* Retrieved Artifacts Table */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-brand-text/70">
                <span>RETRIEVED ARTIFACTS ({artifactCount})</span>
                <span>STATUS</span>
              </div>

              {artifactCount === 0 ? (
                <div className="p-4 border border-dashed border-brand-text/40 text-center font-mono text-[10px] text-brand-text/60 uppercase">
                  No artifacts currently registered. Click &quot;Re-test Live&quot; below.
                </div>
              ) : (
                <div className="border border-brand-text bg-brand-surface max-h-44 overflow-y-auto divide-y divide-brand-text/20">
                  {(diagnostic?.artifacts || []).map((art, idx) => (
                    <div key={art.id || idx} className="p-2 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-black text-brand-accent shrink-0">
                          {art.artifactId || `SYM-${String(idx + 1).padStart(2, "0")}`}
                        </span>
                        <span className="font-black uppercase truncate text-brand-text">
                          {art.name}
                        </span>
                        {art.inscription && (
                          <span className="font-serif text-[11px] text-brand-text/75 shrink-0 hidden sm:inline">
                            {art.inscription}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[9px]">
                        <span className="text-brand-text/60">
                          {art.specimenIds?.length || 0} specs
                        </span>
                        <span className="px-1.5 py-0.2 bg-brand-text text-brand-bg font-black uppercase text-[8px]">
                          {art.status || "LIVE"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-brand-text/20 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleRunLiveTest}
                  className="px-3 py-1.5 bg-brand-accent text-white hover:bg-black font-black uppercase text-[9.5px] border border-brand-text shadow-[2px_2px_0px_#050505] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Query Firestore collection 'artifacts' live without TTL cache"
                >
                  <RefreshCw size={11} className={isVerifying ? "animate-spin" : ""} />
                  <span>{isVerifying ? "QUERYING FIRESTORE..." : "RE-TEST LIVE"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDumpToConsole}
                  className="px-2.5 py-1.5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text font-black uppercase text-[9.5px] border border-brand-text shadow-[2px_2px_0px_#050505] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Dumps console.table of artifacts to DevTools console"
                >
                  <Terminal size={11} />
                  <span>{copyFeedback ? "DUMPED TO DEVTOOLS!" : "DEVTOOLS DUMP"}</span>
                </button>
              </div>

              {onOpenStudio && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenStudio();
                  }}
                  className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-text hover:text-brand-bg text-brand-text font-black uppercase text-[9px] border border-brand-text transition-colors cursor-pointer"
                >
                  STUDIO ARCHIVE →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
