import React, { useState } from "react";
import { Product, TastingReview } from "../types/cigar";
import { Sparkles, Star, Plus, Wine, Wind, Flame, Edit3, MessageSquare } from "lucide-react";

interface TastingNotesTabProps {
  products: Product[];
  reviews: Record<number, TastingReview>;
  onSaveReview: (review: Partial<TastingReview> & { product_id: number }) => void;
  onOpenAIReview: (product: Product) => void;
}

const COMMON_AROMAS = [
  "Cedro",
  "Cuoio",
  "Cacao amaro",
  "Chicco di caffè",
  "Pepe nero",
  "Terra bagnata",
  "Frutta secca",
  "Fieno ed erbe",
  "Vaniglia",
  "Legna affumicata",
  "Miele selvatico",
  "Spezie dolci",
];

export const TastingNotesTab: React.FC<TastingNotesTabProps> = ({
  products,
  reviews,
  onSaveReview,
  onOpenAIReview,
}) => {
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [stelle, setStelle] = useState<number>(5);
  const [descrizione, setDescrizione] = useState("");
  const [selectedAromas, setSelectedAromas] = useState<string[]>([]);
  const [forza, setForza] = useState<any>("Media");
  const [combustione, setCombustione] = useState<any>("Perfetta");
  const [tiraggio, setTiraggio] = useState<any>("Ottimale");
  const [abbinamento, setAbbinamento] = useState("");

  const reviewsList = Object.values(reviews);

  const startEdit = (productId: number) => {
    const existing = reviews[productId];
    setEditingProductId(productId);
    if (existing) {
      setStelle(existing.stelle || 5);
      setDescrizione(existing.descrizione || "");
      setSelectedAromas(existing.aromi || []);
      setForza(existing.forza || "Media");
      setCombustione(existing.combustione || "Perfetta");
      setTiraggio(existing.tiraggio || "Ottimale");
      setAbbinamento(existing.abbinamento_consigliato || "");
    } else {
      setStelle(5);
      setDescrizione("");
      setSelectedAromas([]);
      setForza("Media");
      setCombustione("Perfetta");
      setTiraggio("Ottimale");
      setAbbinamento("");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    onSaveReview({
      product_id: editingProductId,
      stelle,
      descrizione,
      aromi: selectedAromas,
      forza,
      combustione,
      tiraggio,
      abbinamento_consigliato: abbinamento,
    });
    setEditingProductId(null);
  };

  const toggleAroma = (aroma: string) => {
    if (selectedAromas.includes(aroma)) {
      setSelectedAromas(selectedAromas.filter((a) => a !== aroma));
    } else {
      setSelectedAromas([...selectedAromas, aroma]);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
            Note di Degustazione
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Archivio sensoriale personale: ruota degli aromi, tiraggio, forza e abbinamenti
          </p>
        </div>
        <button
          onClick={() => startEdit(products[0]?.id || 1)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl transition-all shadow-md shadow-[#b37d3e]/20 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#14100e] stroke-[2.5]" />
          <span>Nuova Nota di Degustazione</span>
        </button>
      </div>

      {/* Editor Modal / Card if open */}
      {editingProductId !== null && (
        <div className="p-6 rounded-2xl bg-[#1b1411] border border-[#c99757]/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#2e231e]">
            <h2 className="text-base font-bold text-[#faf3ea]">
              Compila Scheda Sensoriale
            </h2>
            <button
              onClick={() => setEditingProductId(null)}
              className="text-xs text-[#a3948b] hover:text-[#f5ebd9]"
            >
              Chiudi
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Seleziona Sigaro
              </label>
              <select
                value={editingProductId}
                onChange={(e) => startEdit(Number(e.target.value))}
                className="w-full bg-[#130f0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.marca} ({p.provenienza}) - {p.formato || "Standard"}
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Valutazione Generale
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStelle(star)}
                    className="p-1 text-xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= stelle ? "text-[#c99757] fill-[#c99757]" : "text-[#4d382d]"
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono text-sm font-bold text-[#c99757] ml-2">
                  {stelle}.0 / 5.0
                </span>
              </div>
            </div>

            {/* Aromas Wheel Selector */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1.5">
                Sentori & Aromi Riscontrati (clicca per selezionare)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_AROMAS.map((aroma) => {
                  const isSel = selectedAromas.includes(aroma);
                  return (
                    <button
                      key={aroma}
                      type="button"
                      onClick={() => toggleAroma(aroma)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                        isSel
                          ? "bg-[#c99757] text-[#14100e] font-semibold shadow-sm"
                          : "bg-[#140f0e] text-[#a3948b] hover:text-[#f5ebd9] border border-[#2b201a]"
                      }`}
                    >
                      {aroma}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mechanical Properties: Forza, Combustione, Tiraggio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Forza</label>
                <select
                  value={forza}
                  onChange={(e) => setForza(e.target.value)}
                  className="w-full bg-[#130f0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
                >
                  <option value="Leggera">Leggera</option>
                  <option value="Medio-leggera">Medio-leggera</option>
                  <option value="Media">Media</option>
                  <option value="Medio-forte">Medio-forte</option>
                  <option value="Forte">Forte</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Combustione</label>
                <select
                  value={combustione}
                  onChange={(e) => setCombustione(e.target.value)}
                  className="w-full bg-[#130f0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
                >
                  <option value="Perfetta">Perfetta</option>
                  <option value="Buona">Buona</option>
                  <option value="Irregolare">Irregolare</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Tiraggio</label>
                <select
                  value={tiraggio}
                  onChange={(e) => setTiraggio(e.target.value)}
                  className="w-full bg-[#130f0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
                >
                  <option value="Ottimale">Ottimale</option>
                  <option value="Aperto">Aperto</option>
                  <option value="Serrato">Serrato</option>
                </select>
              </div>
            </div>

            {/* Pairing */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Abbinamento consigliato (es. Rum 12 anni, Grappa, Espresso, Cioccolato fondente)
              </label>
              <input
                type="text"
                value={abbinamento}
                onChange={(e) => setAbbinamento(e.target.value)}
                placeholder="Es. Ron Zacapa 23 Anni o Caffè espresso tostato scuro"
                className="w-full bg-[#130f0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
              />
            </div>

            {/* Description / Notes */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Note di Degustazione ed Evoluzione nei tre terzi
              </label>
              <textarea
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                rows={4}
                placeholder="Descrivi l'apertura, il corpo al secondo terzo, la pienezza e il finale..."
                className="w-full bg-[#130f0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProductId(null)}
                className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md"
              >
                Salva Scheda Degustazione
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviewsList.map((rev) => {
          const prod = products.find((p) => p.id === rev.product_id);
          return (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-[#c99757] font-medium">
                      {prod?.provenienza || "Sigaro"}
                    </span>
                    <h3 className="text-base font-bold text-[#faf3ea] mt-0.5">
                      {prod?.marca || "Sigaro"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-[#241a15] px-2.5 py-1 rounded-lg border border-[#382a22]">
                    <span className="text-xs font-mono font-bold text-[#c99757]">{rev.stelle}.0</span>
                    <div className="flex text-[#c99757] text-xs">
                      {"★".repeat(rev.stelle)}
                      {"☆".repeat(5 - rev.stelle)}
                    </div>
                  </div>
                </div>

                {/* Technical Properties */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#a3948b]">
                  {rev.forza && (
                    <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                      Forza: <strong className="text-[#f5ebd9]">{rev.forza}</strong>
                    </span>
                  )}
                  {rev.combustione && (
                    <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                      Combustione: <strong className="text-[#f5ebd9]">{rev.combustione}</strong>
                    </span>
                  )}
                  {rev.tiraggio && (
                    <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                      Tiraggio: <strong className="text-[#f5ebd9]">{rev.tiraggio}</strong>
                    </span>
                  )}
                </div>

                {/* Aromas */}
                {rev.aromi && rev.aromi.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {rev.aromi.map((a, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium text-[#d9aa6b] bg-[#261d18] px-2 py-0.5 rounded-md border border-[#382a22]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-[#c4b5a8] mt-3 leading-relaxed bg-[#130f0d] p-3 rounded-xl border border-[#221a16] italic">
                  "{rev.descrizione}"
                </p>

                {/* Pairing */}
                {rev.abbinamento_consigliato && (
                  <div className="flex items-center gap-2 text-xs text-[#d9aa6b] mt-3">
                    <Wine className="w-3.5 h-3.5 text-[#c99757]" />
                    <span>Abbinamento: {rev.abbinamento_consigliato}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 mt-4 border-t border-[#261d19] flex items-center justify-between">
                <button
                  onClick={() => startEdit(rev.product_id)}
                  className="text-xs text-[#c99757] hover:text-[#d9aa6b] flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifica scheda</span>
                </button>

                {prod && (
                  <button
                    onClick={() => onOpenAIReview(prod)}
                    className="text-xs text-[#a3948b] hover:text-[#f5ebd9] flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c99757]" />
                    <span>Sintesi Community AI</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
