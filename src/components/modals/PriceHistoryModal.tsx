import React from "react";
import { Product, PriceHistoryPoint } from "../../types/cigar";
import { X, History, TrendingUp, TrendingDown, FileText } from "lucide-react";

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  history: PriceHistoryPoint[];
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  history,
}) => {
  if (!isOpen || !product) return null;

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(val);
  };

  const sorted = [...history].sort((a, b) => new Date(a.valido_dal).getTime() - new Date(b.valido_dal).getTime());
  const minPrice = Math.min(...sorted.map((h) => h.prezzo_singolo)) * 0.95;
  const maxPrice = Math.max(...sorted.map((h) => h.prezzo_singolo)) * 1.05;
  const range = maxPrice - minPrice || 1;

  // Coordinate SVG
  const width = 450;
  const height = 150;
  const padding = 25;

  const points = sorted.map((h, i) => {
    const x = padding + (i / Math.max(sorted.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((h.prezzo_singolo - minPrice) / range) * (height - 2 * padding);
    return { x, y, ...h };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#c99757]" />
            <div>
              <h2 className="text-base font-bold text-[#faf3ea]">
                Storico Prezzi Ufficiali FIT
              </h2>
              <span className="text-xs text-[#8c7e75] block">
                {product.marca} · Codice ADM #{product.codice_prodotto}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Current vs Initial */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#120e0d] rounded-xl border border-[#241c18] text-xs">
            <div>
              <span className="text-[#8c7e75] block">Prezzo Ufficiale Oggi</span>
              <span className="text-xl font-bold font-mono text-[#f5ebd9] tabular-nums">
                {formatEuro(product.prezzo_singolo)}
              </span>
            </div>
            <div>
              <span className="text-[#8c7e75] block">Variazione Rilevata (180gg)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(product.variazione_180gg || 0) > 0 ? (
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                ) : (product.variazione_180gg || 0) < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                ) : null}
                <span className={`text-base font-mono font-bold ${(product.variazione_180gg || 0) > 0 ? "text-rose-400" : (product.variazione_180gg || 0) < 0 ? "text-emerald-400" : "text-[#a3948b]"}`}>
                  {(product.variazione_180gg || 0) > 0 ? `+${(product.variazione_180gg || 0).toFixed(2)} €` : `${(product.variazione_180gg || 0).toFixed(2)} €`}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Trend Chart */}
          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c18]">
            <span className="text-[11px] font-semibold text-[#8c7e75] uppercase tracking-wider block mb-2">
              Curva Andamento Storico (fino a 5 anni)
            </span>
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
                {/* Grid lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#241b17" strokeDasharray="3 3" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#241b17" strokeDasharray="3 3" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#241b17" />

                {/* Path line */}
                <path d={pathD} fill="none" stroke="#c99757" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Circles & Labels */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#140f0e" stroke="#c99757" strokeWidth="2" />
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      fill="#e8decb"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {p.prezzo_singolo.toFixed(2)}€
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Table of tariff changes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#a3948b] block">
              Determine Amministrative & Variazioni di Listino:
            </span>
            <div className="divide-y divide-[#241c18] border border-[#241c18] rounded-xl overflow-hidden bg-[#120e0d]">
              {sorted.map((h, i) => (
                <div key={i} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[#f5ebd9] font-medium block">
                      {h.valido_dal}
                    </span>
                    <span className="text-[10px] text-[#7d6f66] flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 text-[#c99757]" />
                      <span>{h.fonte_documento}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono tabular-nums text-sm font-bold text-[#c99757]">
                      {formatEuro(h.prezzo_singolo)} / pz
                    </span>
                    <span className="text-[10px] text-[#8c7e75] block font-mono">
                      Conf: {formatEuro(h.prezzo_confezione)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#291f1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
