import React, { useState } from "react";
import { HumidorItem, HumidorLocation } from "../types/cigar";
import { Box, Search, Plus, Flame, Thermometer, Droplets, MapPin, Calendar, Edit3, Trash2, ArrowRightLeft, Sparkles } from "lucide-react";

interface HumidorTabProps {
  items: HumidorItem[];
  locations: HumidorLocation[];
  onOpenPurchaseModal: () => void;
  onOpenFumataForProduct: (item: HumidorItem) => void;
  onOpenTastingNote: (productId: number) => void;
  onDeleteItem: (id: number) => void;
  onUpdateQuantity: (id: number, remaining: number) => void;
  onMoveLocation: (id: number, newLocationId: number) => void;
}

export const HumidorTab: React.FC<HumidorTabProps> = ({
  items,
  locations,
  onOpenPurchaseModal,
  onOpenFumataForProduct,
  onOpenTastingNote,
  onDeleteItem,
  onUpdateQuantity,
  onMoveLocation,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [movingItemId, setMovingItemId] = useState<number | null>(null);

  const formatEuro = (val?: number) => {
    if (val === undefined || val === null) return "€ 0,00";
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(val);
  };

  const filteredItems = items.filter((item) => {
    if (selectedLocationId !== "all" && item.location_id !== selectedLocationId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchBrand = (item.product?.marca || "").toLowerCase().includes(q);
      const matchShop = (item.shop_nome || "").toLowerCase().includes(q);
      const matchNotes = (item.note || "").toLowerCase().includes(q);
      if (!matchBrand && !matchShop && !matchNotes) return false;
    }
    return true;
  });

  const totalGiacenza = filteredItems.reduce((s, i) => s + i.quantita_rimanente, 0);
  const totalValore = filteredItems.reduce((s, i) => s + i.prezzo_acquisto * i.quantita_rimanente, 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
            Il Tuo Humidor
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Inventario, condizioni microclimatiche e tracciamento invecchiamento
          </p>
        </div>
        <button
          onClick={onOpenPurchaseModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl transition-all shadow-md shadow-[#b37d3e]/20 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#14100e] stroke-[2.5]" />
          <span>Aggiungi Sigari all'Humidor</span>
        </button>
      </div>

      {/* Microclimate Locations Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {locations.map((loc) => {
          const count = items.filter((i) => i.location_id === loc.id).reduce((s, i) => s + i.quantita_rimanente, 0);
          const isSelected = selectedLocationId === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(isSelected ? "all" : loc.id)}
              className={`text-left p-4 rounded-xl border transition-all text-xs ${
                isSelected
                  ? "bg-[#251d18] border-[#c99757] shadow-md shadow-black/30"
                  : "bg-[#181210] border-[#2e231e] hover:border-[#443328]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: loc.colore }}
                  />
                  <span className="font-semibold text-sm text-[#f5ebd9] truncate">{loc.nome}</span>
                </div>
                <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded bg-[#130e0d] text-[#c99757]">
                  {count} pz
                </span>
              </div>

              <div className="flex items-center gap-4 text-[#a3948b] mt-3">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-mono tabular-nums text-white font-medium">
                    {loc.temperatura ? `${loc.temperatura.toFixed(1)}°C` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono tabular-nums text-white font-medium">
                    {loc.umidita ? `${loc.umidita.toFixed(1)}% UR` : "—"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#181311] rounded-xl border border-[#2e231e]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d6f66] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per marca, tabaccheria o note..."
            className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg pl-9 pr-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#8c7e75] px-1">
          <span>Mostrati: <strong className="text-[#f5ebd9] font-mono">{filteredItems.length}</strong> lotti</span>
          <span aria-hidden="true">·</span>
          <span>Giacenza: <strong className="text-[#c99757] font-mono">{totalGiacenza}</strong> pz</span>
          <span aria-hidden="true">·</span>
          <span>Valore: <strong className="text-[#d9aa6b] font-mono">{formatEuro(totalValore)}</strong></span>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
          <Box className="w-12 h-12 text-[#6e5c52] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#f5ebd9]">Nessun sigaro trovato</h3>
          <p className="text-xs text-[#8c7e75] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Nessun risultato corrisponde alla ricerca corrente."
              : "Il tuo humidor è vuoto. Registra il tuo primo acquisto per iniziare."}
          </p>
          <button
            onClick={onOpenPurchaseModal}
            className="mt-4 px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-lg shadow-sm"
          >
            Aggiungi Sigaro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const prod = item.product;
            const currentOfficial = prod?.prezzo_singolo ?? item.prezzo_acquisto;
            const diff = currentOfficial - item.prezzo_acquisto;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.location_colore || "#8b5e34" }}
                        />
                        <span className="text-[11px] font-medium text-[#c99757]">
                          {item.location_nome}
                        </span>
                        {prod?.provenienza && (
                          <>
                            <span className="text-[#52443c]">·</span>
                            <span className="text-[11px] text-[#a3948b]">{prod.provenienza}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#faf3ea] mt-1">
                        {prod?.marca || "Sigaro"}
                      </h3>
                      {prod?.vitola && (
                        <p className="text-xs text-[#8c7e75] mt-0.5">{prod.vitola}</p>
                      )}
                    </div>

                    {/* Quantity Badge with Stepper */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center bg-[#130f0d] border border-[#2f241f] rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantita_rimanente - 1)}
                          disabled={item.quantita_rimanente <= 0}
                          className="w-6 h-6 flex items-center justify-center text-xs text-[#a3948b] hover:text-[#f5ebd9] disabled:opacity-30 rounded hover:bg-[#251c18]"
                          title="Diminuisci giacenza"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-sm text-[#f5ebd9] tabular-nums">
                          {item.quantita_rimanente}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantita_rimanente + 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs text-[#a3948b] hover:text-[#f5ebd9] rounded hover:bg-[#251c18]"
                          title="Aumenta giacenza"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[10px] text-[#7d6f66] block mt-1">
                        su {item.quantita_iniziale} acquistati
                      </span>
                    </div>
                  </div>

                  {/* Financial & Metadata Info */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-[#130f0d] rounded-xl border border-[#231a16] text-xs">
                    <div>
                      <span className="text-[11px] text-[#7d6f66] block">Prezzo d'Acquisto</span>
                      <span className="font-mono tabular-nums text-[#e8decb] font-medium">
                        {formatEuro(item.prezzo_acquisto)} / pz
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#7d6f66] block">Prezzo Ufficiale FIT</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[#f5ebd9] font-medium">
                          {formatEuro(currentOfficial)}
                        </span>
                        {diff !== 0 && (
                          <span className={`text-[10px] font-mono ${diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes & Shop Info */}
                  <div className="space-y-1 text-xs text-[#8c7e75]">
                    {item.shop_nome && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#a3948b] shrink-0" />
                        <span className="truncate">{item.shop_nome}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#a3948b] shrink-0" />
                      <span>Acquistato il {item.data_acquisto}</span>
                    </div>
                    {item.note && (
                      <p className="italic text-[#c4b5a8] mt-2 bg-[#171210] p-2 rounded border border-[#261d19]">
                        "{item.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-[#261d19] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenFumataForProduct(item)}
                    disabled={item.quantita_rimanente <= 0}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] disabled:opacity-40 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Fuma Ora</span>
                  </button>

                  <button
                    onClick={() => onOpenTastingNote(item.product_id)}
                    className="p-2 text-[#a3948b] hover:text-[#c99757] bg-[#1a1310] hover:bg-[#251c18] border border-[#2f241f] rounded-lg transition-colors"
                    title="Note di Degustazione"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Move location selector toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                      className="p-2 text-[#a3948b] hover:text-[#f5ebd9] bg-[#1a1310] hover:bg-[#251c18] border border-[#2f241f] rounded-lg transition-colors"
                      title="Sposta in altro humidor/location"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    {movingItemId === item.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#1f1815] border border-[#3d2e26] rounded-xl p-1.5 shadow-xl z-20">
                        <span className="text-[10px] text-[#8c7e75] px-2 py-1 block">Sposta in:</span>
                        {locations.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => {
                              onMoveLocation(item.id, loc.id);
                              setMovingItemId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 text-xs text-[#e8decb] hover:bg-[#2c221e] rounded flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.colore }} />
                            <span className="truncate">{loc.nome}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 text-[#7d6f66] hover:text-rose-400 bg-[#1a1310] hover:bg-[#251c18] border border-[#2f241f] rounded-lg transition-colors"
                    title="Elimina dall'inventario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
