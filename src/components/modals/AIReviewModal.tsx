import React, { useState, useEffect } from "react";
import { Product } from "../../types/cigar";
import { X, Sparkles, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    sintesi: string;
    fonti: Array<{ nome: string; url: string }>;
    generato_il: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !product) {
      setData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/reviews/${product.id}/generate`, { method: "POST" })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Errore fetch recensione:", err))
      .finally(() => setLoading(false));
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c99757]" />
            <div>
              <h2 className="text-base font-bold text-[#faf3ea]">
                Sintesi Recensioni & Club del Fumo
              </h2>
              <span className="text-xs text-[#8c7e75] block">
                {product.marca} ({product.provenienza})
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#c99757] animate-spin mx-auto" />
              <p className="text-xs text-[#a3948b]">
                Consultazione dei forum e dei portali di fumo lento italiani in corso...
              </p>
            </div>
          ) : data ? (
            <>
              <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c18] space-y-2">
                <span className="text-[11px] font-semibold text-[#c99757] uppercase tracking-wider block">
                  Consenso degli Appassionati:
                </span>
                <p className="text-xs text-[#e8decb] leading-relaxed whitespace-pre-line">
                  {data.sintesi}
                </p>
              </div>

              {/* Sources */}
              {data.fonti && data.fonti.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#a3948b] block">
                    Fonti & Comunità Italiane Consultate:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.fonti.map((fonte, idx) => (
                      <a
                        key={idx}
                        href={fonte.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg bg-[#120e0d] border border-[#241c18] hover:border-[#c99757] transition-colors flex items-center justify-between text-xs text-[#a3948b] hover:text-[#f5ebd9]"
                      >
                        <span className="truncate">{fonte.nome}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#c99757] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#7d6f66] italic py-4">Nessuna informazione disponibile.</p>
          )}
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
