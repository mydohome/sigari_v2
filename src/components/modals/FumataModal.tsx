import React, { useState, useEffect } from "react";
import { Product, HumidorItem, Fumata } from "../../types/cigar";
import { X, Flame, Clock, Calendar, Wine, Star } from "lucide-react";

interface FumataModalProps {
  isOpen: boolean;
  onClose: () => void;
  humidorItems: HumidorItem[];
  products: Product[];
  preSelectedProduct?: Product | null;
  preSelectedItem?: HumidorItem | null;
  editingFumata?: Fumata | null;
  onUpdate?: (id: number, data: any) => void;
  onSubmit: (data: {
    humidor_item_id?: number;
    product_id: number;
    quantita: number;
    data_fumata: string;
    ora_inizio?: string;
    ora_fine?: string;
    riaccensioni: number;
    stelle?: number;
    note?: string;
    abbinamento?: string;
  }) => void;
}

export const FumataModal: React.FC<FumataModalProps> = ({
  isOpen,
  onClose,
  humidorItems,
  products,
  preSelectedProduct,
  preSelectedItem,
  editingFumata,
  onUpdate,
  onSubmit,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number | "catalog">(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [dataFumata, setDataFumata] = useState<string>(new Date().toISOString().split("T")[0]);
  const [oraInizio, setOraInizio] = useState<string>("20:30");
  const [oraFine, setOraFine] = useState<string>("21:45");
  const [riaccensioni, setRiaccensioni] = useState<number>(0);
  const [stelle, setStelle] = useState<number>(5);
  const [note, setNote] = useState<string>("");
  const [abbinamento, setAbbinamento] = useState<string>("");

  useEffect(() => {
    if (editingFumata) {
      setSelectedItemId(editingFumata.humidor_item_id || "catalog");
      setSelectedProductId(editingFumata.product_id);
      setDataFumata(editingFumata.data_fumata || new Date().toISOString().split("T")[0]);
      setOraInizio(editingFumata.ora_inizio || "20:30");
      setOraFine(editingFumata.ora_fine || "21:45");
      setRiaccensioni(editingFumata.riaccensioni || 0);
      setStelle(editingFumata.stelle || 5);
      setNote(editingFumata.note || "");
      setAbbinamento(editingFumata.abbinamento || "");
    } else if (preSelectedItem) {
      setSelectedItemId(preSelectedItem.id);
      setSelectedProductId(preSelectedItem.product_id);
      setNote("");
      setAbbinamento("");
    } else if (preSelectedProduct) {
      setSelectedItemId("catalog");
      setSelectedProductId(preSelectedProduct.id);
      setNote("");
      setAbbinamento("");
    } else if (humidorItems.length > 0) {
      setSelectedItemId(humidorItems[0].id);
      setSelectedProductId(humidorItems[0].product_id);
      setNote("");
      setAbbinamento("");
    } else if (products.length > 0) {
      setSelectedItemId("catalog");
      setSelectedProductId(products[0].id);
      setNote("");
      setAbbinamento("");
    }
  }, [editingFumata, preSelectedItem, preSelectedProduct, humidorItems, products, isOpen]);

  if (!isOpen) return null;

  const handleItemSelect = (val: string) => {
    if (val === "catalog") {
      setSelectedItemId("catalog");
    } else {
      const id = Number(val);
      setSelectedItemId(id);
      const itm = humidorItems.find((i) => i.id === id);
      if (itm) setSelectedProductId(itm.product_id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFumata && onUpdate) {
      onUpdate(editingFumata.id, {
        data_fumata: dataFumata,
        ora_inizio: oraInizio || undefined,
        ora_fine: oraFine || undefined,
        riaccensioni,
        stelle,
        note: note.trim() || undefined,
        abbinamento: abbinamento.trim() || undefined,
      });
    } else {
      onSubmit({
        humidor_item_id: selectedItemId !== "catalog" ? Number(selectedItemId) : undefined,
        product_id: selectedProductId,
        quantita: 1,
        data_fumata: dataFumata,
        ora_inizio: oraInizio || undefined,
        ora_fine: oraFine || undefined,
        riaccensioni,
        stelle,
        note: note.trim() || undefined,
        abbinamento: abbinamento.trim() || undefined,
      });
    }
    onClose();
  };

  // Calcola durata al volo per anteprima
  const [h1, m1] = oraInizio.split(":").map(Number);
  const [h2, m2] = oraFine.split(":").map(Number);
  let durPreview = h2 * 60 + m2 - (h1 * 60 + m1);
  if (durPreview < 0) durPreview += 24 * 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#c99757]" />
            <h2 className="text-base font-bold text-[#faf3ea]">
              {editingFumata ? "Modifica Fumata" : "Registra Nuova Fumata"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Cigar source selector */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Origine del Sigaro
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
            >
              <optgroup label="Dal tuo Humidor (decrementa scorta)">
                {humidorItems.map((itm) => (
                  <option key={itm.id} value={itm.id}>
                    {itm.product?.marca} ({itm.location_nome} - {itm.quantita_rimanente} rimasti)
                  </option>
                ))}
              </optgroup>
              <option value="catalog">Altro dal catalogo generale FIT...</option>
            </select>
          </div>

          {selectedItemId === "catalog" && (
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Seleziona Sigaro dal Catalogo
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.marca} ({p.provenienza}) - {p.prezzo_singolo.toFixed(2)} €
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">
                Data Fumata
              </label>
              <input
                type="date"
                value={dataFumata}
                onChange={(e) => setDataFumata(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">
                Ora Inizio
              </label>
              <input
                type="time"
                value={oraInizio}
                onChange={(e) => setOraInizio(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">
                Ora Fine
              </label>
              <input
                type="time"
                value={oraFine}
                onChange={(e) => setOraFine(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
          </div>

          {/* Duration preview & Relights */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#120e0d] border border-[#241c18] text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#c99757]" />
              <span>Durata stimata: <strong className="text-[#f5ebd9] font-mono">{durPreview} minuti</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#8c7e75]">Riaccensioni:</span>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRiaccensioni(Math.max(0, riaccensioni - 1))}
                  className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-mono font-bold text-[#f5ebd9]">{riaccensioni}</span>
                <button
                  type="button"
                  onClick={() => setRiaccensioni(riaccensioni + 1)}
                  className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Valutazione Sessione
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStelle(s)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${s <= stelle ? "text-[#c99757] fill-[#c99757]" : "text-[#4d382d]"}`}
                  />
                </button>
              ))}
              <span className="font-mono text-xs font-bold text-[#c99757] ml-2">
                {stelle}.0 stelle
              </span>
            </div>
          </div>

          {/* Pairing */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Abbinamento (Bevanda / Distillato)
            </label>
            <input
              type="text"
              value={abbinamento}
              onChange={(e) => setAbbinamento(e.target.value)}
              placeholder="Es. Ron Diplomático Reserva Exclusiva, Espresso amaro, Single Malt"
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Note di Fumata & Commento
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Sensazioni organolettiche, tiraggio, cenere, piacevolezza complessiva..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#291f1a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md active:scale-95"
            >
              {editingFumata ? "Salva Modifiche" : "Registra nel Diario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
