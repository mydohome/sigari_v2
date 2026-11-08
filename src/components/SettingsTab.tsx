import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { HumidorLocation, HumidorItem, BackupInfo, Product, Fumata } from "../types/cigar";
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  Key,
  Thermometer,
  Droplets,
  HardDrive,
  Copy,
  Terminal,
  FileSpreadsheet,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Box,
  Radio,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface SettingsTabProps {
  locations: HumidorLocation[];
  items: HumidorItem[];
  products?: Product[];
  fumate?: Fumata[];
  backups: BackupInfo[];
  onRefreshData: () => void;
  onRefreshBackups: () => void;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (filename: string) => Promise<void>;
  onDeleteBackup: (filename: string) => Promise<void>;
}

type SettingsSection = "locations" | "excel" | "homeassistant" | "backups" | "cli" | null;

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
  products = [],
  fumate = [],
  backups,
  onRefreshData,
  onRefreshBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
}) => {
  // Navigation: null = Hub view (box grid); string = sub-section view
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);

  // Notification toast inside settings
  const [localFeedback, setLocalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setLocalFeedback({ type, text });
    setTimeout(() => setLocalFeedback(null), 3500);
  };

  // -------------------------------------------------------------
  // 1. LOCATION STATE & HANDLERS
  // -------------------------------------------------------------
  const [newLocName, setNewLocName] = useState("");
  const [newLocColor, setNewLocColor] = useState("#8b5e34");
  const [newLocTemp, setNewLocTemp] = useState("19.5");
  const [newLocHumidity, setNewLocHumidity] = useState("69.0");
  const [isAddingLoc, setIsAddingLoc] = useState(false);

  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [editLocName, setEditLocName] = useState("");
  const [editLocColor, setEditLocColor] = useState("");

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
        notify("Nuova location aggiunta con successo!");
        onRefreshData();
      }
    } catch (err: any) {
      notify("Errore creazione location: " + err.message, "error");
    } finally {
      setIsAddingLoc(false);
    }
  };

  const startEditingLocation = (loc: HumidorLocation) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.nome);
    setEditLocColor(loc.colore);
  };

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
        notify("Location aggiornata!");
        onRefreshData();
      }
    } catch (err: any) {
      notify("Errore modifica: " + err.message, "error");
    }
  };

  const handleDeleteLocation = async (id: number, name: string) => {
    const assignedCigars = items
      .filter((i) => i.location_id === id)
      .reduce((s, i) => s + i.quantita_rimanente, 0);
    const msg =
      assignedCigars > 0
        ? `La location "${name}" contiene ${assignedCigars} sigari. Rimuovendola, i sigari risulteranno 'Non assegnati'. Confermi l'eliminazione?`
        : `Eliminare definitivamente la location "${name}"?`;

    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`/api/humidor/locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify(`Location "${name}" eliminata.`);
        onRefreshData();
      }
    } catch (err: any) {
      notify("Errore eliminazione: " + err.message, "error");
    }
  };

  // -------------------------------------------------------------
  // 2. EXCEL IMPORT / EXPORT STATE & HANDLERS
  // -------------------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importDefaultLocationId, setImportDefaultLocationId] = useState<number>(locations[0]?.id || 1);
  const [isImporting, setIsImporting] = useState(false);

  // Export: Humidor inventory
  const handleExportHumidor = (format: "xlsx" | "csv") => {
    if (items.length === 0) {
      notify("Nessun sigaro presente in humidor da esportare.", "error");
      return;
    }
    const data = items.map((item) => {
      const prod = item.product;
      const fitPrice = prod?.prezzo_singolo ?? item.prezzo_acquisto;
      return {
        "ID Lotto": item.id,
        "Marca / Modello": prod?.marca || "Sigaro",
        Vitola: prod?.vitola || "",
        Provenienza: prod?.provenienza || "Cuba",
        Categoria: prod?.categoria || "Sigari",
        Location: item.location_nome || "Non assegnata",
        "Prezzo Acquisto Singolo (€)": item.prezzo_acquisto,
        "Prezzo Ufficiale FIT Singolo (€)": fitPrice,
        "Diff Prezzo (€)": +(fitPrice - item.prezzo_acquisto).toFixed(2),
        "Quantità Iniziale": item.quantita_iniziale,
        "Quantità Rimanente": item.quantita_rimanente,
        "Valore Rimanente (€)": +(item.quantita_rimanente * item.prezzo_acquisto).toFixed(2),
        "Tabaccheria / Negozio": item.shop_nome || "",
        "Data Acquisto": item.data_acquisto || "",
        "Note Personali": item.note || "",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `sigari_humidor_inventario_${dateStr}.${format}`;
    const ws = XLSX.utils.json_to_sheet(data);

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario Humidor");
      XLSX.writeFile(wb, fileName);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
    }
    notify(`Inventario esportato con successo (${fileName})!`);
  };

  // Export: Smokes Journal
  const handleExportFumate = (format: "xlsx" | "csv") => {
    if (fumate.length === 0) {
      notify("Nessuna sessione di fumata registrata nel diario.", "error");
      return;
    }
    const data = fumate.map((f) => ({
      "ID Fumata": f.id,
      "Data Fumata": f.data_fumata,
      "Marca / Sigaro": f.product?.marca || "Sigaro",
      Vitola: f.product?.vitola || "",
      "Ora Inizio": f.ora_inizio || "",
      "Ora Fine": f.ora_fine || "",
      "Durata (minuti)": f.durata_minuti || "",
      "Quantità Fumata": f.quantita,
      Riaccensioni: f.riaccensioni ?? 0,
      "Valutazione (Stelle 1-5)": f.stelle || "",
      Abbinamento: f.abbinamento || "",
      "Note di Fumata": f.note || "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `sigari_diario_fumate_${dateStr}.${format}`;
    const ws = XLSX.utils.json_to_sheet(data);

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Diario Fumate");
      XLSX.writeFile(wb, fileName);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
    }
    notify(`Diario fumate esportato (${fileName})!`);
  };

  // Export: Official Catalog
  const handleExportCatalogo = (format: "xlsx" | "csv") => {
    if (products.length === 0) {
      notify("Nessun prodotto disponibile a catalogo.", "error");
      return;
    }
    const data = products.map((p) => ({
      "Codice ADM / Prodotto": p.codice_prodotto || "",
      "Marca / Denominazione": p.marca,
      Vitola: p.vitola || "",
      Provenienza: p.provenienza || "",
      Categoria: p.categoria || "Sigari",
      "Prezzo Confezione (€)": p.prezzo_confezione,
      "Pezzi per Confezione": p.pezzi_per_confezione || 1,
      "Prezzo Singolo (€)": p.prezzo_singolo,
      "Data Aggiornamento FIT": p.ultimo_aggiornamento || "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `sigari_catalogo_fit_${dateStr}.${format}`;
    const ws = XLSX.utils.json_to_sheet(data);

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catalogo FIT");
      XLSX.writeFile(wb, fileName);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
    }
    notify(`Catalogo FIT esportato (${fileName})!`);
  };

  // Download blank import template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Marca / Modello (richiesto)": "Partagás Serie D No. 4",
        "Quantità (pz)": 5,
        "Prezzo Acquisto Singolo (€)": 15.5,
        Location: locations[0]?.nome || "Humidor Principale",
        "Tabaccheria / Negozio": "Tabaccheria del Corso",
        "Data Acquisto (AAAA-MM-GG)": new Date().toISOString().split("T")[0],
        Note: "Box 2024, ottima capa maduro",
      },
      {
        "Marca / Modello (richiesto)": "Montecristo No. 2",
        "Quantità (pz)": 3,
        "Prezzo Acquisto Singolo (€)": 21.0,
        Location: locations[0]?.nome || "Humidor Principale",
        "Tabaccheria / Negozio": "Habanos Specialist",
        "Data Acquisto (AAAA-MM-GG)": new Date().toISOString().split("T")[0],
        Note: "Forma piramidale classica",
      },
      {
        "Marca / Modello (richiesto)": "Toscano Antico",
        "Quantità (pz)": 10,
        "Prezzo Acquisto Singolo (€)": 3.8,
        Location: locations[1]?.nome || "Giara",
        "Tabaccheria / Negozio": "Tabacchi Centrale",
        "Data Acquisto (AAAA-MM-GG)": new Date().toISOString().split("T")[0],
        Note: "Stagionatura al 65% UR",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modello Import Sigari");
    XLSX.writeFile(wb, "modello_importazione_sigari.xlsx");
    notify("Template di esempio scaricato con successo!");
  };

  // Helper download blob
  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rawJson || rawJson.length === 0) {
          notify("Il file selezionato è vuoto o non contiene dati.", "error");
          setImportRows([]);
          return;
        }

        // Normalizza le colonne trovate
        const normalized = rawJson.map((row) => {
          // cerca campi possibili
          const marca =
            row["Marca / Modello (richiesto)"] ||
            row["Marca"] ||
            row["marca"] ||
            row["Marca / Modello"] ||
            row["Denominazione"] ||
            row["Sigaro"] ||
            row["Nome"] ||
            "";

          const quantita =
            row["Quantità (pz)"] ||
            row["Quantità"] ||
            row["quantita"] ||
            row["Quantità Iniziale"] ||
            row["Quantità Rimanente"] ||
            row["Pezzi"] ||
            1;

          const prezzo =
            row["Prezzo Acquisto Singolo (€)"] ||
            row["Prezzo Acquisto"] ||
            row["Prezzo"] ||
            row["prezzo_acquisto"] ||
            row["Prezzo Singolo"] ||
            null;

          const location =
            row["Location"] ||
            row["location"] ||
            row["Contenitore"] ||
            row["Humidor"] ||
            "";

          const shop =
            row["Tabaccheria / Negozio"] ||
            row["Tabaccheria"] ||
            row["Negozio"] ||
            row["shop"] ||
            "";

          const dataAcquisto =
            row["Data Acquisto (AAAA-MM-GG)"] ||
            row["Data Acquisto"] ||
            row["Data"] ||
            row["data_acquisto"] ||
            new Date().toISOString().split("T")[0];

          const note = row["Note"] || row["note"] || row["Note Personali"] || "";

          return {
            marca: String(marca).trim(),
            quantita: Math.max(1, Number(quantita) || 1),
            prezzo_acquisto: prezzo !== null && prezzo !== undefined ? Number(prezzo) : undefined,
            location_nome: location ? String(location).trim() : undefined,
            shop_nome: shop ? String(shop).trim() : undefined,
            data_acquisto: String(dataAcquisto).trim(),
            note: note ? String(note).trim() : undefined,
          };
        }).filter((r) => Boolean(r.marca));

        setImportRows(normalized);
        if (normalized.length === 0) {
          notify("Nessuna riga valida con nome sigaro individuata nel foglio.", "error");
        } else {
          notify(`Individuati ${normalized.length} sigari da importare!`);
        }
      } catch (err: any) {
        notify("Errore durante la lettura del file: " + err.message, "error");
        setImportRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Execute bulk import
  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);
    try {
      // Per ogni riga se location_nome non è specificata, usa importDefaultLocationId
      const payload = importRows.map((r) => ({
        ...r,
        location_id: r.location_nome ? undefined : importDefaultLocationId,
      }));

      const res = await fetch("/api/humidor/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const d = await res.json();
      if (res.ok) {
        notify(`🎉 Importati con successo ${d.count} sigari nell'Humidor!`);
        setImportRows([]);
        setImportFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onRefreshData();
      } else {
        notify(d.error || "Errore durante l'importazione", "error");
      }
    } catch (err: any) {
      notify("Errore di rete: " + err.message, "error");
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. HOME ASSISTANT STATE & HANDLERS
  // -------------------------------------------------------------
  const [haApiKey, setHaApiKey] = useState("");
  const [haSaving, setHaSaving] = useState(false);
  const [testLocId, setTestLocId] = useState<number>(locations[0]?.id || 1);
  const [testTemp, setTestTemp] = useState("19.8");
  const [testHum, setTestHum] = useState("69.5");
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetch("/api/settings/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.ha_api_key) setHaApiKey(data.ha_api_key);
      })
      .catch((err) => console.error("Errore fetch config:", err));
  }, []);

  const handleSaveHaKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setHaSaving(true);
    try {
      const res = await fetch("/api/settings/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ha_api_key: haApiKey }),
      });
      if (res.ok) {
        notify("Chiave Home Assistant salvata e attiva!");
      }
    } catch (err: any) {
      notify("Errore salvataggio HA key: " + err.message, "error");
    } finally {
      setHaSaving(false);
    }
  };

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
        setTestMessage(`✔ Telemetria inviata a "${data.location.nome}": ${testTemp}°C · ${testHum}% UR`);
        notify(`Telemetria aggiornata per ${data.location.nome}`);
        onRefreshData();
      }
    } catch (err: any) {
      setTestMessage(`✖ Errore: ${err.message}`);
    } finally {
      setTestLoading(false);
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

  // -------------------------------------------------------------
  // 4. BACKUP STATE & HANDLERS
  // -------------------------------------------------------------
  const [backupLoading, setBackupLoading] = useState(false);

  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      await onCreateBackup();
      notify("Snapshot di backup creato con successo!");
    } catch (err: any) {
      notify("Errore backup: " + err.message, "error");
    } finally {
      setBackupLoading(false);
    }
  };

  const totalCigars = items.reduce((s, i) => s + i.quantita_rimanente, 0);

  // -------------------------------------------------------------
  // RENDER: SECTION BOXES (HUB VIEW)
  // -------------------------------------------------------------
  const renderHubView = () => {
    const sections = [
      {
        id: "locations" as SettingsSection,
        title: "Location & Microclima",
        badge: `${locations.length} contenitori`,
        badgeColor: "bg-[#271d18] text-[#c99757] border-[#382b24]",
        icon: Box,
        iconColor: "text-[#c99757]",
        description: "Gestisci Humidor in cedro, Giare in ceramica, Boccacci di vetro e Tupperdor. Imposta temperature e soglie ideali di umidità (% UR).",
        details: `${totalCigars} sigari custoditi attualmente`,
      },
      {
        id: "excel" as SettingsSection,
        title: "Importazione / Esportazione Excel",
        badge: "XLSX & CSV",
        badgeColor: "bg-[#2a1d12] text-[#d9aa6b] border-[#593d25]",
        icon: FileSpreadsheet,
        iconColor: "text-amber-400",
        description: "Esporta inventario humidor, note del diario e listino prezzi FIT in fogli di calcolo. Importa file Excel con anteprima tabellare e template pre-compilato.",
        details: "Esporta Humidor, Fumate, Listino FIT · Importa lotti",
      },
      {
        id: "homeassistant" as SettingsSection,
        title: "Home Assistant & Sensori IoT",
        badge: haApiKey ? "Attiva" : "Non configurata",
        badgeColor: haApiKey ? "bg-emerald-950/80 text-emerald-400 border-emerald-800" : "bg-[#221815] text-[#8c7e75] border-[#382b24]",
        icon: Radio,
        iconColor: "text-sky-400",
        description: "Collega termoidrometri Bluetooth / Zigbee via webhook HTTP. Configura il token segreto, copia gli snippet YAML e testa la sincronizzazione.",
        details: haApiKey ? "Token protetto impostato" : "Nessun token inserito",
      },
      {
        id: "backups" as SettingsSection,
        title: "Backup Manuale & Snapshot",
        badge: `${backups.length} archivi`,
        badgeColor: "bg-[#231b17] text-[#f5ebd9] border-[#3a2c24]",
        icon: HardDrive,
        iconColor: "text-[#d9aa6b]",
        description: "Genera istantaneamente una copia di sicurezza completa del database locale. Scarica i file JSON o effettua il ripristino con salvataggio preventivo.",
        details: backups[0] ? `Ultimo: ${new Date(backups[0].creato_il).toLocaleDateString("it-IT")}` : "Nessun backup salvato",
      },
      {
        id: "cli" as SettingsSection,
        title: "Console Server CLI & Docker",
        badge: "v2.2.0 · Terminale",
        badgeColor: "bg-[#1f1917] text-[#a3948b] border-[#342721]",
        icon: Terminal,
        iconColor: "text-emerald-400",
        description: "Promemoria della sintassi dei comandi bash ./cli/sigari (update, backup, restore, scrape, stats) da eseguire via SSH.",
        details: "Esecuzione esclusiva da console server",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Intro Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] relative overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#c99757] font-semibold block mb-1">
                Pannello di Amministrazione
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#faf3ea]">
                Seleziona un'area di configurazione
              </h2>
              <p className="text-xs sm:text-sm text-[#8c7e75] mt-1 max-w-2xl">
                Tutte le impostazioni sono organizzate in sezioni dedicate per un'esperienza più ordinata. Clicca su un box per aprirlo; usa il pulsante di ritorno per rientrare in questo menu.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-[#120e0d] px-3.5 py-2 rounded-xl border border-[#2c201a]">
              <HardDrive className="w-4 h-4 text-[#c99757]" />
              <div className="text-right">
                <span className="text-[10px] text-[#7d6f66] block">Stato Sistema</span>
                <span className="font-mono text-xs font-bold text-[#f5ebd9]">Postgres 16 + Node 22</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Clickable Navigation Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="group text-left p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#c99757] transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between active:scale-[0.99] focus:outline-none"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#221814] border border-[#382a22] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#c99757] transition-all">
                        <Icon className={`w-5 h-5 ${sec.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#faf3ea] group-hover:text-[#c99757] transition-colors">
                          {sec.title}
                        </h3>
                        <span className="text-[11px] text-[#7d6f66] block font-mono">
                          {sec.details}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shrink-0 font-medium ${sec.badgeColor}`}>
                      {sec.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[#a3948b] leading-relaxed line-clamp-2 mt-1">
                    {sec.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#231a15] flex items-center justify-between text-xs font-semibold text-[#c99757] group-hover:text-[#f5ebd9]">
                  <span>Apri sezione</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER: TOP BAR WITH BACK BUTTON
  // -------------------------------------------------------------
  const renderTopBar = (title: string, subtitle: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#291f1a]">
      <div className="flex items-center gap-3">
        {/* Tasto Back */}
        <button
          onClick={() => setActiveSection(null)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#f5ebd9] bg-[#221a16] hover:bg-[#2d221d] border border-[#3d2e26] hover:border-[#c99757] rounded-xl transition-all shadow-sm active:scale-95 group shrink-0"
          title="Torna all'indice delle impostazioni"
        >
          <ArrowLeft className="w-4 h-4 text-[#c99757] group-hover:-translate-x-1 transition-transform" />
          <span>Indietro</span>
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8c7e75] font-mono">
            <span>Impostazioni</span>
            <span>/</span>
            <span className="text-[#c99757] font-semibold">{title}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#faf3ea] mt-0.5">{title}</h2>
        </div>
      </div>

      <span className="text-xs text-[#8c7e75] italic">{subtitle}</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Toast Feedback */}
      {localFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in ${
            localFeedback.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-700"
              : "bg-rose-950/90 text-rose-300 border-rose-700"
          }`}
        >
          <span>{localFeedback.text}</span>
          <button onClick={() => setLocalFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            Chiudi
          </button>
        </div>
      )}

      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea] flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#c99757]" />
            <span>Impostazioni & Strumenti</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Gestione location, importazione ed esportazione Excel, Home Assistant e backup
          </p>
        </div>

        {activeSection && (
          <button
            onClick={() => setActiveSection(null)}
            className="self-start sm:self-auto text-xs text-[#c99757] hover:text-[#f5ebd9] underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Menu Principale Impostazioni</span>
          </button>
        )}
      </div>

      {/* VIEW SWITCHER */}
      {activeSection === null && renderHubView()}

      {/* -------------------------------------------------------- */}
      {/* SECTION: LOCATIONS */}
      {/* -------------------------------------------------------- */}
      {activeSection === "locations" && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
          {renderTopBar(
            "Location & Microclima",
            "Configurazione dei contenitori fisici e sensori"
          )}

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
      )}

      {/* -------------------------------------------------------- */}
      {/* SECTION: EXCEL IMPORT / EXPORT */}
      {/* -------------------------------------------------------- */}
      {activeSection === "excel" && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
            {renderTopBar(
              "Importazione ed Esportazione Excel",
              "Fogli di calcolo Microsoft Excel (.xlsx) e file CSV"
            )}

            {/* ESPORTAZIONE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#c99757]" />
                <h3 className="text-base font-bold text-[#faf3ea]">
                  Esporta Dati su Foglio di Calcolo
                </h3>
              </div>
              <p className="text-xs text-[#8c7e75]">
                Scarica i tuoi dati completi in formato <strong>Excel (.xlsx)</strong> con formattazione tabellare automatica, oppure in formato <strong>CSV</strong> compatibile con qualsiasi software di analisi o foglio Google.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* 1. Esporta Humidor */}
                <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c99757] block font-semibold">
                      Inventario Attuale
                    </span>
                    <h4 className="font-bold text-sm text-[#f5ebd9] mt-0.5">Sigari in Humidor</h4>
                    <p className="text-[11px] text-[#8c7e75] mt-1">
                      Include marca, vitola, location, prezzo pagato, listino FIT, giacenza, tabaccheria e note.
                    </p>
                    <span className="font-mono text-xs text-[#a3948b] block mt-2">
                      {items.length} lotti registrati ({totalCigars} sigari)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#221814]">
                    <button
                      onClick={() => handleExportHumidor("xlsx")}
                      className="flex-1 py-2 px-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleExportHumidor("csv")}
                      className="py-2 px-3 text-xs text-[#a3948b] hover:text-[#f5ebd9] bg-[#1a1411] border border-[#2f231c] rounded-lg transition-colors"
                      title="Scarica in formato CSV"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 2. Esporta Diario Fumate */}
                <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c99757] block font-semibold">
                      Diario Sensoriale
                    </span>
                    <h4 className="font-bold text-sm text-[#f5ebd9] mt-0.5">Storico Fumate</h4>
                    <p className="text-[11px] text-[#8c7e75] mt-1">
                      Include data, orari inizio/fine, durata effettiva in minuti, riaccensioni, stelle, note e abbinamenti.
                    </p>
                    <span className="font-mono text-xs text-[#a3948b] block mt-2">
                      {fumate.length} sessioni registrate
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#221814]">
                    <button
                      onClick={() => handleExportFumate("xlsx")}
                      className="flex-1 py-2 px-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleExportFumate("csv")}
                      className="py-2 px-3 text-xs text-[#a3948b] hover:text-[#f5ebd9] bg-[#1a1411] border border-[#2f231c] rounded-lg transition-colors"
                      title="Scarica in formato CSV"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 3. Esporta Catalogo Ufficiale */}
                <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c99757] block font-semibold">
                      Listino ADM / Monopoli
                    </span>
                    <h4 className="font-bold text-sm text-[#f5ebd9] mt-0.5">Catalogo Ufficiale FIT</h4>
                    <p className="text-[11px] text-[#8c7e75] mt-1">
                      Listino completo con codici ministeriali ADM, tipologia confezione, prezzo pacchetto e prezzo unitario.
                    </p>
                    <span className="font-mono text-xs text-[#a3948b] block mt-2">
                      {products.length} referenze a listino
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#221814]">
                    <button
                      onClick={() => handleExportCatalogo("xlsx")}
                      className="flex-1 py-2 px-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleExportCatalogo("csv")}
                      className="py-2 px-3 text-xs text-[#a3948b] hover:text-[#f5ebd9] bg-[#1a1411] border border-[#2f231c] rounded-lg transition-colors"
                      title="Scarica in formato CSV"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEZIONE IMPORTAZIONE */}
            <div className="pt-6 border-t border-[#261d19] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#c99757]" />
                  <h3 className="text-base font-bold text-[#faf3ea]">
                    Importa Sigari da File Excel o CSV
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#c99757] hover:text-[#f5ebd9] bg-[#1f1713] hover:bg-[#281f1a] border border-[#382b24] rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica Modello Esempio (.xlsx)</span>
                </button>
              </div>

              <p className="text-xs text-[#8c7e75]">
                Carica un file Excel con la tua collezione personale. Il sistema riconoscerà automaticamente le colonne <em>Marca/Sigaro</em>, <em>Quantità</em>, <em>Prezzo</em>, <em>Location</em>, <em>Tabaccheria</em>, <em>Data</em> e <em>Note</em>.
              </p>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 sm:p-8 rounded-2xl bg-[#120e0d] border-2 border-dashed border-[#342720] hover:border-[#c99757] transition-all cursor-pointer text-center group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-[#c99757] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-[#f5ebd9] block">
                  {importFileName ? importFileName : "Seleziona o trascina qui il file Excel (.xlsx, .xls) o CSV"}
                </span>
                <span className="text-xs text-[#7d6f66] block mt-1">
                  Formati supportati: Microsoft Excel (.xlsx, .xls), CSV (.csv) con codifica UTF-8
                </span>
              </div>

              {/* Anteprima e Conferma Importazione */}
              {importRows.length > 0 && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#140f0d] border border-[#2f241f] space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-[#f5ebd9] flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Anteprima Dati Riconosciuti ({importRows.length} righe pronte)</span>
                      </span>
                      <span className="text-xs text-[#8c7e75] block mt-0.5">
                        Verifica i dati estratti prima di registrarli definitivamente nell'Humidor
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8c7e75]">Location predefinita:</span>
                      <select
                        value={importDefaultLocationId}
                        onChange={(e) => setImportDefaultLocationId(Number(e.target.value))}
                        className="bg-[#1b1411] border border-[#2f231c] rounded-lg px-2.5 py-1 text-xs text-[#f5ebd9]"
                      >
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabella di Anteprima */}
                  <div className="max-h-60 overflow-y-auto overflow-x-auto rounded-lg border border-[#261d19]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c1512] text-[#c99757] font-mono uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Marca / Modello</th>
                          <th className="p-2.5">Q.tà</th>
                          <th className="p-2.5">Prezzo (€)</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5">Tabaccheria</th>
                          <th className="p-2.5">Data Acquisto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#221915] text-[#d9cbbd] bg-[#120e0d]">
                        {importRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#1a1310]">
                            <td className="p-2.5 font-mono text-[#7d6f66]">{idx + 1}</td>
                            <td className="p-2.5 font-medium text-[#f5ebd9]">{row.marca}</td>
                            <td className="p-2.5 font-mono">{row.quantita} pz</td>
                            <td className="p-2.5 font-mono">
                              {row.prezzo_acquisto ? `€ ${row.prezzo_acquisto.toFixed(2)}` : "Listino"}
                            </td>
                            <td className="p-2.5 text-[#a3948b]">
                              {row.location_nome || locations.find((l) => l.id === importDefaultLocationId)?.nome}
                            </td>
                            <td className="p-2.5 text-[#a3948b]">{row.shop_nome || "—"}</td>
                            <td className="p-2.5 font-mono text-[#a3948b]">{row.data_acquisto}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importRows.length > 15 && (
                    <span className="text-[11px] text-[#7d6f66] block text-center italic">
                      ...altre {importRows.length - 15} righe pronte per l'importazione
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportRows([]);
                        setImportFileName(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isImporting ? "Importazione in corso..." : `Conferma e Importa ${importRows.length} Sigari`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* SECTION: HOME ASSISTANT */}
      {/* -------------------------------------------------------- */}
      {activeSection === "homeassistant" && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
          {renderTopBar(
            "Home Assistant & Sensori IoT",
            "Integrazione sensori di temperatura e umidità"
          )}

          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                haApiKey ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : "bg-[#251d18] text-[#a3948b]"
              }`}
            >
              {haApiKey ? "Integrazione Attiva (Token configurato)" : "Non ancora configurata"}
            </span>
          </div>

          {/* Form token */}
          <form onSubmit={handleSaveHaKey} className="space-y-3">
            <label className="text-xs font-medium text-[#c4b5a8] block">
              Chiave Segreta Home Assistant (<code className="text-[#c99757] font-mono">HA_API_KEY</code>)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={haApiKey}
                onChange={(e) => setHaApiKey(e.target.value)}
                placeholder="Incolla qui la chiave API creata in Home Assistant..."
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
          </form>

          {/* Home Assistant YAML Documentation Box */}
          <div className="p-4 rounded-xl bg-[#120e0d] border border-[#261d18] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#c99757]">
                Snippet per <code className="text-[#f5ebd9]">configuration.yaml</code> in Home Assistant:
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
{`# Invia telemetria automatica a Sigari Track da sensore Xiaomi / Tuya / Zigbee
rest_command:
  aggiorna_umidita_humidor:
    url: "http://TUO-SERVER:3000/api/ha/location-humidity"
    method: POST
    headers:
      Content-Type: "application/json"
      x-ha-token: "${haApiKey || "TUA_API_KEY"}"
    payload: '{"location_id": 1, "umidita": {{ states("sensor.umidita_humidor") }} }'

  aggiorna_temperatura_humidor:
    url: "http://TUO-SERVER:3000/api/ha/location-temp"
    method: POST
    headers:
      Content-Type: "application/json"
      x-ha-token: "${haApiKey || "TUA_API_KEY"}"
    payload: '{"location_id": 1, "temperatura": {{ states("sensor.temperatura_humidor") }} }'`}
            </pre>
          </div>

          {/* Interactive Sensor Test Simulator */}
          <div className="p-4 rounded-xl bg-[#140f0d] border border-[#261d19] space-y-3">
            <span className="text-xs font-semibold text-[#f5ebd9] block">
              Simulatore Chiamata Webhook Sensore:
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
                  <span>Invia Test Webhook</span>
                </button>
              </div>
            </div>
            {testMessage && (
              <p className="text-xs text-[#c99757] font-mono mt-1">{testMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* SECTION: BACKUPS */}
      {/* -------------------------------------------------------- */}
      {activeSection === "backups" && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
          {renderTopBar(
            "Backup Manuale & Snapshot",
            "Archiviazione sicura e ripristino di tutto il database"
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#8c7e75]">
              Crea copie complete di sicurezza delle tabelle: <em>inventario humidor, microclima, fumate, recensioni sensoriali, preferiti e wishlist</em>.
            </p>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
                <span>{backupLoading ? "Creazione in corso..." : "Esegui Backup Manuale Ora"}</span>
              </button>
            </div>
          </div>

          {/* Backups List */}
          {backups.length === 0 ? (
            <div className="text-center py-10 bg-[#120e0d] rounded-xl border border-dashed border-[#291f1a]">
              <HardDrive className="w-8 h-8 text-[#544339] mx-auto mb-2" />
              <p className="text-xs text-[#8c7e75]">Nessun file di backup presente.</p>
              <p className="text-[11px] text-[#6b5d54] mt-0.5">Clicca su 'Esegui Backup Manuale Ora' per generare il primo snapshot.</p>
            </div>
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
      )}

      {/* -------------------------------------------------------- */}
      {/* SECTION: SERVER CLI */}
      {/* -------------------------------------------------------- */}
      {activeSection === "cli" && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-6 shadow-sm">
          {renderTopBar(
            "Console Server CLI & Docker",
            "Gestione e manutenzione avanzata da terminale SSH"
          )}

          <div className="p-4 rounded-xl bg-[#120e0d] border border-[#261d18] space-y-3">
            <span className="text-xs font-semibold text-[#c99757] block">
              Script di Controllo: <code className="text-[#f5ebd9] font-mono">./cli/sigari</code>
            </span>
            <p className="text-xs text-[#8c7e75] leading-relaxed">
              I comandi di manutenzione, aggiornamento del codice e sincronizzazione vengono lanciati direttamente dalla console del server o del container Docker per garantire la massima stabilità:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#0e0a09] border border-[#221814] space-y-1">
                <span className="text-[#d9aa6b] font-bold block">./cli/sigari update -y</span>
                <span className="text-[11px] text-[#7d6f66] block font-sans">
                  Scarica gli ultimi commit dal repository remoto, applica le migrazioni schema del database ed esegue il rebuild del container in background.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a09] border border-[#221814] space-y-1">
                <span className="text-[#d9aa6b] font-bold block">./cli/sigari backup</span>
                <span className="text-[11px] text-[#7d6f66] block font-sans">
                  Effettua il dump completo JSON con timestamp nella cartella <code>/app/downloads/backups/</code>.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a09] border border-[#221814] space-y-1">
                <span className="text-[#d9aa6b] font-bold block">./cli/sigari scrape</span>
                <span className="text-[11px] text-[#7d6f66] block font-sans">
                  Interroga il listino ufficiale della Federazione Italiana Tabaccai (FIT) e aggiorna i prezzi di tutti i sigari cubani, toscani ed extra-cubani.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a09] border border-[#221814] space-y-1">
                <span className="text-[#d9aa6b] font-bold block">./cli/sigari status</span>
                <span className="text-[11px] text-[#7d6f66] block font-sans">
                  Mostra lo stato di salute dei container (Node.js su porta web, PostgreSQL su rete interna privata) e ultimo scrape effettuato.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
