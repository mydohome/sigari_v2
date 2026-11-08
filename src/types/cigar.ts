export type Provenienza = "Cuba" | "Italia" | "Extra-Cuba" | "Altro";

export interface Product {
  id: number;
  marca: string;
  categoria: string;
  formato: string | null;
  pezzi_per_confezione: number;
  prezzo_confezione: number;
  prezzo_singolo: number;
  codice_prodotto: string;
  provenienza: Provenienza;
  variazione_180gg?: number; // delta in euro rispetto a 180 giorni fa (+0.50 o -0.20)
  ultimo_aggiornamento: string;
  descrizione_breve?: string;
  vitola?: string;
  lunghezza_mm?: number;
  ceppo?: number; // ring gauge
}

export interface PriceHistoryPoint {
  valido_dal: string;
  prezzo_confezione: number;
  prezzo_singolo: number;
  fonte_documento: string;
}

export interface HumidorShop {
  id: number;
  nome: string;
  indirizzo?: string;
  lat?: number;
  lon?: number;
}

export interface HumidorLocation {
  id: number;
  nome: string;
  colore: string;
  temperatura?: number | null;
  temperatura_aggiornata_il?: string | null;
  umidita?: number | null;
  umidita_aggiornata_il?: string | null;
}

export interface HumidorItem {
  id: number;
  product_id: number;
  product?: Product;
  shop_id?: number | null;
  shop_nome?: string | null;
  location_id?: number | null;
  location_nome?: string | null;
  location_colore?: string | null;
  prezzo_acquisto: number;
  data_acquisto: string;
  quantita_iniziale: number;
  quantita_rimanente: number;
  note?: string | null;
  created_at: string;
}

export interface Fumata {
  id: number;
  humidor_item_id: number;
  product_id: number;
  product?: Product;
  quantita: number;
  data_fumata: string;
  ora_inizio?: string | null;
  ora_fine?: string | null;
  durata_minuti?: number | null;
  riaccensioni?: number | null;
  stelle?: number | null;
  note?: string | null;
  abbinamento?: string | null;
  created_at: string;
}

export interface TastingReview {
  id: number;
  product_id: number;
  stelle: number;
  descrizione: string;
  aromi?: string[];
  forza?: "Leggera" | "Medio-leggera" | "Media" | "Medio-forte" | "Forte";
  combustione?: "Perfetta" | "Buona" | "Irregolare";
  tiraggio?: "Ottimale" | "Aperto" | "Serrato";
  abbinamento_consigliato?: string;
  updated_at: string;
}

export interface Favorite {
  id: number;
  product_id: number;
  product?: Product;
  tag?: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  product_id: number;
  product?: Product;
  quantita: number;
  created_at: string;
}

export interface HumidorStats {
  totale_in_humidor: number;
  valore_in_humidor: number;
  valore_investito: number;
  media_settimanale: number;
  media_mensile: number;
  media_annuale: number;
  fumate_totali: number;
  durata_media_minuti: number | null;
  fumate_con_durata: number;
  serieSettimanale: Array<{ periodo: string; totale: number }>;
  serieMensile: Array<{ periodo: string; totale: number }>;
  topMarche: Array<{ marca: string; totale: number }>;
  distribuzioneProvenienza: Array<{ provenienza: string; totale: number; valore: number }>;
  distribuzioneLocation: Array<{ location: string; colore: string; totale: number; valore: number }>;
}

export interface BackupInfo {
  filename: string;
  dimensione: number;
  creato_il: string;
}

export interface ServerCommandOutput {
  command: string;
  output: string;
  success: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

export interface DockerServiceStatus {
  service: string;
  container: string;
  status: "running" | "healthy" | "stopped" | "unhealthy";
  port: string;
  uptime: string;
  image: string;
}
