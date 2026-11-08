import React, { useState, useEffect } from "react";
import { BackupInfo } from "../types/cigar";
import { Terminal, Play, Download, RotateCcw, Trash2, CheckCircle2, AlertCircle, HardDrive, Cpu, RefreshCw, Copy, Check } from "lucide-react";

interface ServerConsoleTabProps {
  onRunServerCommand: (cmd: string) => Promise<{ success: boolean; output: string; timestamp: string }>;
  backups: BackupInfo[];
  onRefreshBackups: () => void;
  onRestoreBackup: (filename: string) => Promise<void>;
  onDeleteBackup: (filename: string) => Promise<void>;
  onCreateBackup: () => Promise<void>;
}

export const ServerConsoleTab: React.FC<ServerConsoleTabProps> = ({
  onRunServerCommand,
  backups,
  onRefreshBackups,
  onRestoreBackup,
  onDeleteBackup,
  onCreateBackup,
}) => {
  const [commandInput, setCommandInput] = useState("sigari status");
  const [terminalHistory, setTerminalHistory] = useState<Array<{ text: string; isInput?: boolean }>>([
    { text: "=== SIGARI TRACK SERVER MANAGEMENT CONSOLE (v2.1.0) ===" },
    { text: "Digita un comando o clicca sui pulsanti rapidi in basso per interagire con lo stack Docker." },
    { text: "Comandi disponibili: sigari status, sigari stats, sigari backup, sigari scrape, sigari update." },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const executeCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;
    setIsRunning(true);
    setTerminalHistory((prev) => [...prev, { text: `$ ${trimmed}`, isInput: true }]);

    try {
      const res = await onRunServerCommand(trimmed);
      setTerminalHistory((prev) => [...prev, { text: res.output }]);
      if (trimmed.includes("backup")) {
        onRefreshBackups();
      }
    } catch (err: any) {
      setTerminalHistory((prev) => [...prev, { text: `[ERRORE]: ${err.message || "Errore esecuzione comando"}` }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(commandInput);
  };

  const copyCliInstruction = () => {
    navigator.clipboard.writeText("./cli/sigari update -y");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea] flex items-center gap-2.5">
            <Terminal className="w-7 h-7 text-[#c99757]" />
            <span>Console Server & Docker Stack</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Gestione remota dei container, scraping manuale, backup del database e aggiornamenti
          </p>
        </div>
      </div>

      {/* Docker Stack Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#181311] border border-[#2e231e] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f5ebd9]">sigari-backend</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">
                RUNNING
              </span>
            </div>
            <span className="text-xs text-[#8c7e75] block mt-0.5">Node.js 22 · Porta :3000</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181311] border border-[#2e231e] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f5ebd9]">sigari-db</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">
                HEALTHY
              </span>
            </div>
            <span className="text-xs text-[#8c7e75] block mt-0.5">PostgreSQL 16 · Porta :5432</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#181311] border border-[#2e231e] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f5ebd9]">Volumi Docker</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 font-mono">
                PERSISTENT
              </span>
            </div>
            <span className="text-xs text-[#8c7e75] block mt-0.5">sigari_db_data, backups</span>
          </div>
        </div>
      </div>

      {/* Interactive Web Terminal */}
      <div className="rounded-2xl bg-[#0e0b0a] border border-[#2b201a] overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#15100e] border-b border-[#261d18] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-[#8c7e75] ml-2">bash ~ sigari-cli (v2.1)</span>
          </div>
          <button
            onClick={() => setTerminalHistory([{ text: "Terminale pulito." }])}
            className="text-[11px] text-[#7d6f66] hover:text-[#f5ebd9]"
          >
            Pulisci
          </button>
        </div>

        {/* Terminal Screen */}
        <div className="p-4 sm:p-5 font-mono text-xs text-[#d9cbbd] space-y-2 h-72 sm:h-80 overflow-y-auto selection:bg-[#c99757] selection:text-black">
          {terminalHistory.map((item, idx) => (
            <div
              key={idx}
              className={`leading-relaxed whitespace-pre-wrap ${
                item.isInput
                  ? "text-[#c99757] font-bold"
                  : item.text.includes("ERRORE")
                  ? "text-rose-400"
                  : item.text.includes("✔")
                  ? "text-emerald-400"
                  : "text-[#c4b5a8]"
              }`}
            >
              {item.text}
            </div>
          ))}
          {isRunning && (
            <div className="text-[#c99757] animate-pulse">
              ⏳ Elaborazione comando in corso...
            </div>
          )}
        </div>

        {/* Terminal Input Bar */}
        <form onSubmit={handleFormSubmit} className="p-3 bg-[#130e0c] border-t border-[#261d18] flex items-center gap-2">
          <span className="text-[#c99757] font-mono font-bold text-xs pl-2">$</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={isRunning}
            placeholder="sigari update, sigari backup, sigari scrape, sigari status..."
            className="flex-1 bg-transparent border-0 text-xs text-[#f5ebd9] font-mono focus:outline-none placeholder-[#5e4f45]"
          />
          <button
            type="submit"
            disabled={isRunning}
            className="px-4 py-1.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-lg hover:from-[#e0b477] flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Esegui</span>
          </button>
        </form>
      </div>

      {/* Quick Server Action Chips */}
      <div className="p-4 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-3">
        <span className="text-xs font-semibold text-[#a3948b] block">
          Comandi Rapidi Preconfigurati (clicca per eseguire):
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { cmd: "sigari status", desc: "Verifica stato stack" },
            { cmd: "sigari stats", desc: "Statistiche collezioni" },
            { cmd: "sigari backup", desc: "Backup istantaneo" },
            { cmd: "sigari scrape", desc: "Sincronizza listini FIT" },
            { cmd: "sigari update", desc: "Git pull & ricompila" },
          ].map((c) => (
            <button
              key={c.cmd}
              onClick={() => {
                setCommandInput(c.cmd);
                executeCommand(c.cmd);
              }}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#140f0e] border border-[#2d221c] text-[#f5ebd9] hover:border-[#c99757] hover:text-[#c99757] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-2.5 h-2.5 text-[#c99757]" />
              <span className="font-semibold">{c.cmd}</span>
              <span className="text-[10px] text-[#7d6f66] font-sans">({c.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Backup Archive & Restore Management */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#261d19]">
          <div>
            <h2 className="text-base font-bold text-[#faf3ea]">
              Archivio Backup del Database
            </h2>
            <p className="text-xs text-[#8c7e75] mt-0.5">
              Snapshot completi di humidor, posizioni, fumate e recensioni (esportabili in JSON/SQL)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshBackups}
              className="p-2 text-xs text-[#a3948b] hover:text-[#f5ebd9] bg-[#140f0e] border border-[#2d211c] rounded-lg"
              title="Ricarica elenco backup"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCreateBackup}
              className="px-3.5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-lg shadow-sm"
            >
              Crea Nuovo Backup
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <p className="text-xs text-[#7d6f66] italic py-4">Nessun backup archiviato al momento.</p>
        ) : (
          <div className="divide-y divide-[#261d19]">
            {backups.map((b) => (
              <div key={b.filename} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono font-bold text-[#f5ebd9]">{b.filename}</div>
                  <div className="text-[11px] text-[#8c7e75] mt-0.5 flex items-center gap-2">
                    <span>Creato: {new Date(b.creato_il).toLocaleString("it-IT")}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{(b.dimensione / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/settings/backups/${b.filename}`}
                    download={b.filename}
                    className="p-2 text-xs text-[#a3948b] hover:text-[#c99757] bg-[#140f0e] border border-[#2d211c] rounded-lg flex items-center gap-1"
                    title="Scarica file di backup sul tuo computer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica</span>
                  </a>

                  <button
                    onClick={() => {
                      if (window.confirm(`Ripristinare il backup ${b.filename}? Verrà creato automaticamente uno snapshot di sicurezza preventivo.`)) {
                        onRestoreBackup(b.filename);
                      }
                    }}
                    className="p-2 text-xs text-[#a3948b] hover:text-emerald-400 bg-[#140f0e] border border-[#2d211c] rounded-lg flex items-center gap-1"
                    title="Ripristina questo backup"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ripristina</span>
                  </button>

                  <button
                    onClick={() => onDeleteBackup(b.filename)}
                    className="p-2 text-xs text-[#7d6f66] hover:text-rose-400 bg-[#140f0e] border border-[#2d211c] rounded-lg"
                    title="Elimina file di backup"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminal SSH Guide */}
      <div className="p-5 rounded-2xl bg-[#140f0d] border border-[#2e231e] space-y-2">
        <h3 className="text-xs font-bold text-[#c99757] uppercase tracking-wider">
          Esecuzione Diretta via SSH sul Server
        </h3>
        <p className="text-xs text-[#a3948b]">
          Puoi eseguire tutti i comandi di gestione anche direttamente dalla shell SSH del tuo server Linux tramite lo script versionato <code className="text-[#f5ebd9] font-mono">./cli/sigari</code>:
        </p>
        <div className="p-3 bg-[#0c0908] rounded-xl border border-[#241a15] flex items-center justify-between font-mono text-xs text-[#e8decb]">
          <span>./cli/sigari update -y</span>
          <button
            onClick={copyCliInstruction}
            className="text-xs text-[#a3948b] hover:text-[#c99757] flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiato" : "Copia"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
