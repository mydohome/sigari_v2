import React, { useState, useEffect } from "react";
import { Product, HumidorLocation, HumidorShop } from "../../types/cigar";
import { X, Plus, Box, MapPin, Calendar, Euro } from "lucide-react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  locations: HumidorLocation[];
  shops: HumidorShop[];
  preSelectedProduct?: Product | null;
  onSubmit: (data: {
    product_id: number;
    location_id: number;
    shop_nome?: string;
    prezzo_acquisto: number;
    data_acquisto: string;
    quantita_iniziale: number;
    note?: string;
  }) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  products,
  locations,
  shops,
  preSelectedProduct,
  onSubmit,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [shopNome, setShopNome] = useState("");
  const [prezzoAcquisto, setPrezzoAcquisto] = useState<number>(15);
  const [dataAcquisto, setDataAcquisto] = useState(new Date().toISOString().split("T")[0]);
  const [quantita, setQuantita] = useState<number>(5);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (preSelectedProduct) {
      setSelectedProductId(preSelectedProduct.id);
      setPrezzoAcquisto(preSelectedProduct.prezzo_singolo);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setPrezzoAcquisto(products[0].prezzo_singolo);
    }
    if (locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [preSelectedProduct, products, locations, isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (prodId: number) => {
    setSelectedProductId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) setPrezzoAcquisto(p.prezzo_singolo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      product_id: selectedProductId,
      location_id: selectedLocationId,
      shop_nome: shopNome.trim() || undefined,
      prezzo_acquisto: Number(prezzoAcquisto),
      data_acquisto: dataAcquisto,
      quantita_iniziale: Number(quantita),
      note: note.trim() || undefined,
    });
    onClose();
  };

  const selectedProd = products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-[#c99757]" />
            <h2 className="text-base font-bold text-[#faf3ea]">
              Aggiungi Sigari all'Humidor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Cigar select */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Sigaro da Catalogo Ufficiale FIT
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(Number(e.target.value))}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.marca} ({p.provenienza}) — {p.prezzo_singolo.toFixed(2)} €
                </option>
              ))}
            </select>
          </div>

          {/* Location Destination */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Destinazione / Humidor
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(Number(e.target.value))}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nome} ({loc.umidita}% UR, {loc.temperatura}°C)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Quantità Acquistata
              </label>
              <input
                type="number"
                min="1"
                max="250"
                value={quantita}
                onChange={(e) => setQuantita(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Prezzo Pagato a Sigaro (€)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={prezzoAcquisto}
                onChange={(e) => setPrezzoAcquisto(Number(e.target.value))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
          </div>

          {/* Purchase Total helper */}
          <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c18] flex items-center justify-between text-xs text-[#8c7e75]">
            <span>Spesa totale investimento:</span>
            <strong className="text-sm font-mono text-[#d9aa6b]">
              € {(quantita * prezzoAcquisto).toFixed(2)}
            </strong>
          </div>

          {/* Shop / Tabaccheria */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Tabaccheria o Rivendita (Opzionale)
            </label>
            <input
              type="text"
              list="shop-suggestions"
              value={shopNome}
              onChange={(e) => setShopNome(e.target.value)}
              placeholder="Es. Tabaccheria del Corso, Habanos Specialist..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
            />
            <datalist id="shop-suggestions">
              {shops.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Data di Acquisto / Ingresso in Humidor
            </label>
            <input
              type="date"
              value={dataAcquisto}
              onChange={(e) => setDataAcquisto(e.target.value)}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Note di Conservazione (Box code, data di inscatolamento, ecc.)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Es. Scatola sigillata timbro ABR 26, conservati a 69% UR..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          {/* Footer */}
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
              Aggiungi all'Humidor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
