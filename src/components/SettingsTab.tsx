import React, { useState, useEffect } from "react";
import { HumidorLocation, HumidorItem, BackupInfo } from "../types/cigar";
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Download,
  RotateCcw,
  RefreshCw,
  Key,
  Thermometer,
  Droplets,
  HardDrive,
  Copy,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface SettingsTabProps {
  locations: HumidorLocation[];
  items: HumidorItem[];
  backups: BackupInfo[];
  onRefreshData: () => void;
  onRefreshBackups: () => void;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (filename: string) => Promise<void>;
  onDeleteBackup: (filename: string) => Promise<void>;
}

const PRESET_COLORS = [
  { name: "Cedro Spagnolo", hex: "#8b5e34" },
  { name: "Giara Blu", hex: "#4a90d9" },
  { name: "Vetro Salvia", hex: "#43a047" },
  { name: "Ambra Dorata", hex: "#d9aa6b" },
  { name: "Ardesia Scuro", hex: "#475569" },
  { name: "Rosso Cuoio", hex: "#991b1b" },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  locations,
  items,
  backups,
  onRefreshData,
  onRefreshBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
}) => {
  // Location form state
  const [newLocName, setNewLocName] = useState("");
  const [newLocColor, setNewLocColor] = useState("#8b5e34");
  const [newLocTemp, setNewLocTemp] = useState("19.5");
  const [newLocHumidity, setNewLocHumidity] = useState("69.0");
  const [isAddingLoc, setIsAddingLoc] = useState(false);

  // Edit location state
  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [editLocName, setEditLocName] = useState("");
  const [editLocColor, setEditLocColor] = useState("");

  // HA API Key state
  const [haApiKey, setHaApiKey] = useState("");
  const [haSaving, setHaSaving] = useState(false);
  const [haSavedSuccess, setHaSavedSuccess] = useState(false);

  // Home Assistant Sensor test state
  const [testLocId, setTestLocId] = useState<number>(locations[0]?.id || 1);
  const [testTemp, setTestTemp] = useState("19.8");
  const [testHum, setTestHum] = useState("69.5");
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Backup creation state
  const [backupLoading, setBackupLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch current settings config on mount
  useEffect(() => {
    fetch("/api/settings/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.ha_api_key) setHaApiKey(data.ha_api_key);
      })
      .catch((err) => console.error("Errore fetch config:", err));
  }, []);

  // Save HA API Key
  const handleSaveHaKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setHaSaving(true);
    setHaSavedSuccess(false);
    try {
      const res = await fetch("/api/settings/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ha_api_key: haApiKey }),
      });
      if (res.ok) {
        setHaSavedSuccess(true);
        setTimeout(() => setHaSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Errore salvataggio HA key:", err);
    } finally {
      setHaSaving(false);
    }
  };

  // Add new location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    setIsAddingLoc(true);
    try {
      const res = await fetch("/api/humidor/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: newLocName.trim(),
          colore: newLocColor,
          temperatura: Number(newLocTemp),
          umidita: Number(newLocHumidity),
        }),
      });
      if (res.ok) {
        setNewLocName("");
        setNewLocColor("#8b5e34");
        onRefreshData();
      }
    } catch (err) {
      console.error("Errore creazione location:", err);
    } finally {
      setIsAddingLoc(false);
    }
  };

  // Start inline edit
  const startEditingLocation = (loc: HumidorLocation) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.nome);
    setEditLocColor(loc.colore);
  };

  // Save edited location
  const handleSaveEditedLocation = async (id: number) => {
    if (!editLocName.trim()) return;
    try {
      const res = await fetch(`/api/humidor/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editLocName.trim(),
          colore: editLocColor,
        }),
      });
      if (res.ok) {
        setEditingLocId(null);
        onRefreshData();
      }
    } catch (err) {
      console.error("Errore modifica location:", err);
    }
  };

  // Delete location
  const handleDeleteLocation = async (id: number, name: string) => {
    const assignedCigars = items.filter((i) => i.location_id === id).reduce((s, i) => s + i.quantita_rimanente, 0);
    const msg = assignedCigars > 0
      ? `La location "${name}" contiene ${assignedCigars} sigari. Rimuovendola, i sigari risulteranno 'Non assegnati'. Confermi l'eliminazione?`
      : `Eliminare definitivamente la location "${name}"?`;

    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`/api/humidor/locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error("Errore eliminazione location:", err);
    }
  };

  // Test send HA webhook
  const handleTestHaWebhook = async () => {
    setTestLoading(true);
    setTestMessage(null);
    try {
      const res = await fetch("/api/settings/ha-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: testLocId,
          temperatura: Number(testTemp),
          umidita: Number(testHum),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestMessage(`✔ Telemetria inviata con successo a "${data.location.nome}": ${testTemp}°C · ${testHum}% UR`);
        onRefreshData();
      }
    } catch (err: any) {
      setTestMessage(`✖ Errore: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // Trigger manual backup
  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      await onCreateBackup();
    } finally {
      setBackupLoading(false);
    }
  };

  const copyHaSnippet = () => {
    const snippet = `rest_command:
  aggiorna_umidita_humidor:
    url: "http://TUO-SERVER:3000/api/ha/location-humidity"
    method: POST
    headers:
      Content-Type: "application/json"
      x-ha-token: "${haApiKey || "TUA_API_KEY"}"
    payload: '{"location_id": 1, "umidita": {{ states("sensor.umidita_humidor") }} }'`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea] flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-[#c99757]" />
          <span>Impostazioni & Configurazione</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
          Gestisci le location fisiche di conservazione, l'integrazione Home Assistant e i backup manuali
        </p>
      </div>

      {/* SECTION 1: GESTIONE LOCATION (HUMIDOR, GIARA, VETRO) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#261d19]">
          <div>
            <h2 className="text-base font-bold text-[#faf3ea] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c99757]" />
              <span>Location di Conservazione (Humidor, Giara, Vetro)</span>
            </h2>
            <p className="text-xs text-[#8c7e75] mt-0.5">
              Definisci i contenitori fisici in cui custodisci i sigari per monitorarne temperatura e umidità
            </p>
          </div>
          <span className="text-xs font-mono text-[#a3948b] bg-[#120e0d] px-3 py-1 rounded-lg border border-[#261d19] self-start sm:self-auto">
            {locations.length} location attive
          </span>
        </div>

        {/* Existing Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {locations.map((loc) => {
            const cigarCount = items
              .filter((i) => i.location_id === loc.id)
              .reduce((s, i) => s + i.quantita_rimanente, 0);

            const isEditing = editingLocId === loc.id;

            return (
              <div
                key={loc.id}
                className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between hover:border-[#382b24] transition-all"
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-[#8c7e75] uppercase block mb-1">Nome Location</label>
                      <input
                        type="text"
                        value={editLocName}
                        onChange={(e) => setEditLocName(e.target.value)}
                        className="w-full bg-[#1b1411] border border-[#3b2d24] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8c7e75] uppercase block mb-1">Colore Etichetta</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editLocColor}
                          onChange={(e) => setEditLocColor(e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setEditLocColor(c.hex)}
                              className="w-5 h-5 rounded-full border border-white/20"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEditedLocation(loc.id)}
                        className="flex-1 py-1.5 text-xs font-semibold text-[#14100e] bg-[#c99757] rounded-lg flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salva</span>
                      </button>
                      <button
                        onClick={() => setEditingLocId(null)}
                        className="px-3 py-1.5 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View Mode */
                  <>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: loc.colore }}
                          />
                          <h3 className="font-bold text-sm text-[#f5ebd9]">{loc.nome}</h3>
                        </div>
                        <span className="font-mono text-xs text-[#c99757] font-semibold bg-[#1e1713] px-2 py-0.5 rounded">
                          {cigarCount} sigari
                        </span>
                      </div>

                      {/* Climate readings */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-[#a3948b]">
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-mono text-[#f5ebd9] font-medium">
                            {loc.temperatura ? `${loc.temperatura.toFixed(1)}°C` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-mono text-[#f5ebd9] font-medium">
                            {loc.umidita ? `${loc.umidita.toFixed(1)}% UR` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#221915] flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => startEditingLocation(loc)}
                        className="p-1.5 text-[#a3948b] hover:text-[#c99757] hover:bg-[#1f1713] rounded-lg transition-colors"
                        title="Modifica nome e colore"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(loc.id, loc.nome)}
                        className="p-1.5 text-[#7d6f66] hover:text-rose-400 hover:bg-[#1f1713] rounded-lg transition-colors"
                        title="Elimina location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Location Form */}
        <form onSubmit={handleAddLocation} className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] space-y-3">
          <span className="text-xs font-semibold text-[#c99757] block">
            Aggiungi Nuova Location di Conservazione:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-[#8c7e75] block mb-1">Nome (es. Humidor Cedro, Giara, Vetro)</label>
              <input
                type="text"
                required
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="Nome contenitore..."
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#8c7e75] block mb-1">Colore Identificativo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newLocColor}
                  onChange={(e) => setNewLocColor(e.target.value)}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewLocColor(c.hex)}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        newLocColor === c.hex ? "scale-110 border-white ring-2 ring-[#c99757]" : "border-transparent opacity-80"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#8c7e75] block mb-1">Temp. Iniziale (°C)</label>
              <input
                type="number"
                step="0.1"
                value={newLocTemp}
                onChange={(e) => setNewLocTemp(e.target.value)}
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#8c7e75] block mb-1">Umidità Iniziale (% UR)</label>
              <input
                type="number"
                step="0.1"
                value={newLocHumidity}
                onChange={(e) => setNewLocHumidity(e.target.value)}
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isAddingLoc}
              className="px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Location</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: INTEGRAZIONE HOME ASSISTANT (HA) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#261d19]">
          <div>
            <h2 className="text-base font-bold text-[#faf3ea] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#c99757]" />
              <span>Integrazione Sensori Home Assistant (HA)</span>
            </h2>
            <p className="text-xs text-[#8c7e75] mt-0.5">
              Collega sensori di temperatura e umidità Bluetooth / Zigbee tramite webhook HTTP protetti
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              haApiKey ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : "bg-[#251d18] text-[#a3948b]"
            }`}
          >
            {haApiKey ? "Integrazione Attiva" : "Non Configurata"}
          </span>
        </div>

        {/* Input API Key Form */}
        <form onSubmit={handleSaveHaKey} className="space-y-3">
          <label className="text-xs font-medium text-[#c4b5a8] block">
            API Token per Home Assistant (<code className="text-[#c99757] font-mono">HA_API_KEY</code>)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={haApiKey}
              onChange={(e) => setHaApiKey(e.target.value)}
              placeholder="Inserisci o incolla la tua chiave segreta per HA (es. ha_token_64hex)..."
              className="flex-1 bg-[#120e0d] border border-[#2f231c] rounded-xl px-3.5 py-2.5 text-xs text-[#f5ebd9] font-mono placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
            <button
              type="submit"
              disabled={haSaving}
              className="px-5 py-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{haSaving ? "Salvataggio..." : "Salva Chiave HA"}</span>
            </button>
          </div>
          {haSavedSuccess && (
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Chiave Home Assistant salvata e attiva!</span>
            </div>
          )}
        </form>

        {/* Home Assistant YAML Documentation Box */}
        <div className="p-4 rounded-xl bg-[#120e0d] border border-[#261d18] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c99757]">
              Esempio Configurazione <code className="text-[#f5ebd9]">configuration.yaml</code> per Home Assistant:
            </span>
            <button
              onClick={copyHaSnippet}
              className="text-xs text-[#a3948b] hover:text-[#c99757] flex items-center gap-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Copiato!" : "Copia Snippet"}</span>
            </button>
          </div>
          <pre className="p-3 bg-[#0a0807] rounded-lg border border-[#201814] text-[11px] font-mono text-[#d9cbbd] overflow-x-auto leading-relaxed">
{`# Invia umidità a Sigari Track da sensore Xiaomi / Zigbee
rest_command:
  aggiorna_umidita_humidor:
    url: "http://TUO-SERVER:3000/api/ha/location-humidity"
    method: POST
    headers:
      Content-Type: "application/json"
      x-ha-token: "${haApiKey || "TUA_API_KEY"}"
    payload: '{"location_id": 1, "umidita": {{ states("sensor.umidita_humidor") }} }'`}
          </pre>
        </div>

        {/* Interactive Sensor Test Simulator */}
        <div className="p-4 rounded-xl bg-[#140f0d] border border-[#261d19] space-y-3">
          <span className="text-xs font-semibold text-[#f5ebd9] block">
            Test Immediato Lettura Sensore (Simulatore Webhook):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] text-[#8c7e75] block mb-1">Location Target</label>
              <select
                value={testLocId}
                onChange={(e) => setTestLocId(Number(e.target.value))}
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8c7e75] block mb-1">Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                value={testTemp}
                onChange={(e) => setTestTemp(e.target.value)}
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8c7e75] block mb-1">Umidità (% UR)</label>
              <input
                type="number"
                step="0.1"
                value={testHum}
                onChange={(e) => setTestHum(e.target.value)}
                className="w-full bg-[#1b1411] border border-[#2f231c] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestHaWebhook}
                disabled={testLoading}
                className="w-full py-2 text-xs font-semibold text-[#f5ebd9] bg-[#2a1f19] hover:bg-[#382b23] border border-[#443329] rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testLoading ? "animate-spin text-[#c99757]" : ""}`} />
                <span>Invia Test Sensore</span>
              </button>
            </div>
          </div>
          {testMessage && (
            <p className="text-xs text-[#c99757] font-mono mt-1">{testMessage}</p>
          )}
        </div>
      </div>

      {/* SECTION 3: BACKUP MANUALE E RIPRISTINO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#261d19]">
          <div>
            <h2 className="text-base font-bold text-[#faf3ea] flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#c99757]" />
              <span>Backup Manuale & Snapshot dei Dati</span>
            </h2>
            <p className="text-xs text-[#8c7e75] mt-0.5">
              Crea copie di sicurezza complete di humidor, posizioni, fumate, recensioni e wishlist
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshBackups}
              className="p-2 text-xs text-[#a3948b] hover:text-[#f5ebd9] bg-[#120e0d] border border-[#2d211c] rounded-xl"
              title="Ricarica elenco backup"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleManualBackup}
              disabled={backupLoading}
              className="px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{backupLoading ? "Salvataggio..." : "Esegui Backup Manuale Ora"}</span>
            </button>
          </div>
        </div>

        {/* Backups List */}
        {backups.length === 0 ? (
          <p className="text-xs text-[#7d6f66] italic py-4">Nessun file di backup presente. Clicca su 'Esegui Backup Manuale Ora'.</p>
        ) : (
          <div className="divide-y divide-[#241c18] border border-[#261d19] rounded-xl overflow-hidden bg-[#120e0d]">
            {backups.map((b) => (
              <div key={b.filename} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-[#f5ebd9] block">
                    {b.filename}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-[#8c7e75] mt-0.5">
                    <span>Creato: {new Date(b.creato_il).toLocaleString("it-IT")}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{(b.dimensione / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <a
                    href={`/api/settings/backups/${b.filename}`}
                    download={b.filename}
                    className="px-3 py-1.5 text-xs text-[#a3948b] hover:text-[#c99757] bg-[#1a1411] border border-[#2f231c] rounded-lg flex items-center gap-1 transition-colors"
                    title="Scarica file di backup"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica</span>
                  </a>

                  <button
                    onClick={() => {
                      if (window.confirm(`Ripristinare lo stato da ${b.filename}? Verrà generato automaticamente un backup di sicurezza preventivo.`)) {
                        onRestoreBackup(b.filename);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-[#a3948b] hover:text-emerald-400 bg-[#1a1411] border border-[#2f231c] rounded-lg flex items-center gap-1 transition-colors"
                    title="Ripristina backup"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ripristina</span>
                  </button>

                  <button
                    onClick={() => onDeleteBackup(b.filename)}
                    className="p-1.5 text-[#7d6f66] hover:text-rose-400 bg-[#1a1411] border border-[#2f231c] rounded-lg transition-colors"
                    title="Elimina backup"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: PROMEMORIA COMANDI SERVER CLI */}
      <div className="p-5 rounded-2xl bg-[#140f0d] border border-[#2e231e] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#c99757] uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          <span>Comandi Server CLI da Console SSH</span>
        </div>
        <p className="text-xs text-[#a3948b] leading-relaxed">
          I comandi di manutenzione e aggiornamento del server vengono eseguiti esclusivamente da terminale tramite lo script <code className="text-[#f5ebd9] font-mono">./cli/sigari</code>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-[#0e0a09] border border-[#221814] text-[#d9aa6b]">
            ./cli/sigari update -y
            <span className="text-[10px] text-[#7d6f66] block font-sans mt-0.5">Aggiorna codice e ricompila container</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0e0a09] border border-[#221814] text-[#d9aa6b]">
            ./cli/sigari backup
            <span className="text-[10px] text-[#7d6f66] block font-sans mt-0.5">Crea backup da riga di comando o cron</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0e0a09] border border-[#221814] text-[#d9aa6b]">
            ./cli/sigari scrape
            <span className="text-[10px] text-[#7d6f66] block font-sans mt-0.5">Scarica nuovo listino prezzi FIT/ADM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
