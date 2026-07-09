"use client";

import { parseLabFile } from "@/lib/api";
import type { FieldProvenance } from "@/lib/fieldDefaults";
import type { FormBiomarkerInput, FormContextFlags } from "@/lib/formTypes";
import {
  confidenceColor,
  FIELD_LABELS,
  mergeParsedIntoForm,
} from "@/lib/parseMerge";
import type { ParsePdfResponse } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  FileText,
  History,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface PdfUploadProps {
  biomarkers: FormBiomarkerInput;
  context: FormContextFlags;
  provenance: FieldProvenance;
  onApply: (
    biomarkers: FormBiomarkerInput,
    context: FormContextFlags,
    provenance: FieldProvenance
  ) => void;
  onSwitchToManual: () => void;
  onImportHistorical?: (parseResult: ParsePdfResponse) => Promise<void>;
}

export function PdfUpload({
  biomarkers,
  context,
  onApply,
  onSwitchToManual,
  onImportHistorical,
}: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsePdfResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "txt", "text"].includes(ext)) {
      setError("Upload a .pdf or .txt lab report.");
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const result = await parseLabFile(file);
      setParseResult(result);
      const fields = new Set(result.biomarkers.map((b) => b.field));
      if (result.sex) fields.add("sex");
      if (result.test_date) fields.add("test_date");
      setSelected(fields);
    } catch (e) {
      setParseResult(null);
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const toggleField = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const applySelected = () => {
    if (!parseResult) return;
    const merged = mergeParsedIntoForm(
      biomarkers,
      context,
      parseResult.biomarkers,
      selected,
      { sex: parseResult.sex, test_date: parseResult.test_date }
    );
    if (parseResult.sex === "male" && merged.context.testosterone_source === "unknown") {
      merged.context.testosterone_source = "endogenous";
    }
    onApply(merged.biomarkers, merged.context, merged.provenance);
    onSwitchToManual();
  };

  const clearParse = () => {
    setParseResult(null);
    setFileName(null);
    setError(null);
    setSelected(new Set());
  };

  const snapshotCount = parseResult?.snapshot_count ?? 0;
  const hasHistorical = snapshotCount > 1 && onImportHistorical;

  const reportBadge =
    parseResult?.parse_method === "phenoage_spreadsheet"
      ? `Levine PhenoAge spreadsheet (${snapshotCount} tests)`
      : parseResult?.parse_method === "labcorp"
      ? "LabCorp bloodwork"
      : parseResult?.parse_method === "canadian_plis"
        ? "Canadian PLIS bloodwork"
        : parseResult?.report_type === "dexa"
        ? "DEXA scan"
        : parseResult?.report_type === "hybrid"
          ? "Lab + DEXA"
          : "Blood lab";

  return (
    <section className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-neon-cyan/60 bg-neon-cyan/5"
            : "border-white/15 bg-bg-card/30 hover:border-white/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {loading ? (
          <Loader2 className="w-10 h-10 mx-auto text-neon-cyan animate-spin" />
        ) : (
          <Upload className="w-10 h-10 mx-auto text-white/30 mb-3" />
        )}
        <p className="text-sm text-white/70">
          Drop lab report or DEXA scan PDF here, or click to browse
        </p>
        <p className="text-xs text-white/35 mt-2">
          LabCorp / Quest / Canadian PLIS • Levine PhenoAge spreadsheet PDF •
          DEXA • max 10 MB
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}

      <AnimatePresence>
        {parseResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-bg-card p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neon-cyan" />
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-white/40">
                    {reportBadge} • {parseResult.parse_method} parse •{" "}
                    confidence {(parseResult.mean_confidence * 100).toFixed(0)}%
                    {parseResult.sex && (
                      <> • detected {parseResult.sex}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearParse}
                className="text-white/40 hover:text-white/70"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {parseResult.warnings.length > 0 && (
              <ul className="text-xs text-amber-400/90 space-y-1">
                {parseResult.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )}

            {parseResult.fields_missing.length > 0 && (
              <p className="text-xs text-white/45">
                Missing blood labs: {parseResult.fields_missing.join(", ")} — add
                from a separate CBC/CMP report or enter manually.
              </p>
            )}

            {hasHistorical && parseResult.historical_snapshots && (
              <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-4 space-y-3">
                <p className="text-sm text-white/80">
                  <History className="w-4 h-4 inline mr-1.5 text-neon-cyan" />
                  {snapshotCount} dated tests found — import all to build trend
                  graphs. Re-uploading overwrites matching dates; older tests stay
                  in history.
                </p>
                <p className="text-[11px] text-white/45">
                  {parseResult.historical_snapshots[0]?.test_date} →{" "}
                  {
                    parseResult.historical_snapshots[
                      parseResult.historical_snapshots.length - 1
                    ]?.test_date
                  }{" "}
                  · {snapshotCount} $POCK (1 per calculation)
                </p>
                <button
                  type="button"
                  disabled={importing}
                  onClick={async () => {
                    if (!parseResult || !onImportHistorical) return;
                    setImporting(true);
                    setError(null);
                    try {
                      await onImportHistorical(parseResult);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Import failed"
                      );
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <History className="w-4 h-4" />
                  )}
                  Import all {snapshotCount} tests &amp; apply latest
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parseResult.sex && (
                <button
                  type="button"
                  onClick={() => toggleField("sex")}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected.has("sex")
                      ? "border-neon-cyan/30 bg-neon-cyan/5"
                      : "border-white/10 bg-black/20 opacity-60"
                  }`}
                >
                  <span>
                    <span className="text-white/80">Sex</span>
                    <span className="text-emerald-300 ml-2 capitalize italic">
                      {parseResult.sex}
                    </span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                    PDF
                  </span>
                </button>
              )}
              {parseResult.test_date && (
                <button
                  type="button"
                  onClick={() => toggleField("test_date")}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected.has("test_date")
                      ? "border-neon-cyan/30 bg-neon-cyan/5"
                      : "border-white/10 bg-black/20 opacity-60"
                  }`}
                >
                  <span>
                    <span className="text-white/80">Test date</span>
                    <span className="text-emerald-300 ml-2 italic">
                      {parseResult.test_date}
                    </span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                    PDF
                  </span>
                </button>
              )}
              {parseResult.biomarkers.map((b) => (
                <button
                  key={b.field}
                  type="button"
                  onClick={() => toggleField(b.field)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected.has(b.field)
                      ? "border-neon-cyan/30 bg-neon-cyan/5"
                      : "border-white/10 bg-black/20 opacity-60"
                  }`}
                >
                  <span>
                    <span className="text-white/80">
                      {FIELD_LABELS[b.field] ?? b.field}
                    </span>
                    <span className="text-emerald-300 ml-2 tabular-nums italic">
                      {b.value} {b.unit}
                    </span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${confidenceColor(b.confidence)}`}
                  >
                    {(b.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>

            {parseResult.raw_text_preview && (
              <details className="text-xs">
                <summary className="text-white/40 cursor-pointer hover:text-white/60">
                  Text preview
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-black/30 text-white/50 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {parseResult.raw_text_preview}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={applySelected}
                disabled={selected.size === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                Apply {selected.size} field{selected.size !== 1 ? "s" : ""} to form
              </button>
              <button
                type="button"
                onClick={onSwitchToManual}
                className="text-sm text-white/45 hover:text-white/70 px-3"
              >
                Skip — edit manually
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}