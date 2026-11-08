# Documento di Handover: Sigari Track (v2) 🍂

Questo documento sintetizza lo stato completo dell'applicazione, le scelte architetturali, lo stack Docker, le funzionalità implementate e le istruzioni operative per riprendere lo sviluppo in qualsiasi momento su una nuova chat o sessione.

---

## 1. Cos'è il Progetto
**Sigari Track (v2)** è una piattaforma web responsive (ottimizzata anche per smartphone e tablet) e containerizzata con Docker per:
1. **Monitorare i prezzi ufficiali dei sigari in Italia** pubblicati dalla Federazione Italiana Tabaccai (FIT) per conto di ADM (Agenzia delle Dogane e dei Monopoli), con rilevazione delle variazioni negli ultimi 180 giorni e grafico storico fino a 5 anni.
2. **Gestire l'inventario personale dei sigari (Humidor)**: lotti, quantità residue, prezzo d'acquisto (con possibilità di modifica e correzione rapida degli importi inseriti per errore), date e negozi/tabaccherie di provenienza.
3. **Supervisionare il microclima dei contenitori**: monitoraggio temperatura (°C) e umidità (% UR) per location distinte (*Humidor in Cedro*, *Giara Vetro Toscani*, *Tupperdor d'Invecchiamento*, ecc.), predisposto per l'integrazione IoT con **Home Assistant**.
4. **Tenere un diario delle degustazioni (Fumate)**: orari di inizio/fine con calcolo automatico della durata, conteggio riaccensioni, abbinamenti e note personali, con possibilità sia di **modifica completa** che di annullamento (con reintegro automatico della giacenza).
5. **Redigere schede sensoriali**: valutazione a stelle, ruota degli aromi (*cedro, cuoio, pepe, cacao, caffè, terra, ecc.*), forza, combustione e tiraggio, con sintesi AI delle opinioni dei club italiani di fumo lento (*GustoTabacco*, *Accademia del Fumo Lento*, *Bottega del Fumatore*).
6. **Pianificare acquisti con Wishlist e Preferiti**: calcolo automatico della spesa preventivata e tag personalizzati.
7. **Consultare una Guida & Enciclopedia**: anatomia del sigaro in 7 punti, foglie della tripa (*Volado*, *Seco*, *Ligero*), scala colori della capa e vitolario.

- **Repository GitHub**: [https://github.com/mydohome/sigari_v2.git](https://github.com/mydohome/sigari_v2.git)

---

## 2. Architettura & Stack Tecnologico

- **Backend**: Node.js 22 + Express (TypeScript con runtime `tsx`), che espone API REST complete per tutte le entità (`/api/prices/*`, `/api/humidor/*`, `/api/settings/*`, `/api/auth/*`, `/api/ha/*`).
- **Database & Storage**:
  - In ambiente Docker di produzione: container PostgreSQL 16 Alpine (`sigari-db`) con volume persistente `sigari_db_data`.
  - In ambiente server/sviluppo: storage JSON transazionale auto-migrante in `data/humidor_db.json`, esportabile e ripristinabile al 100% come dump/snapshot.
- **Frontend**: Single Page Application React 19 + TypeScript, bundler Vite, utility Tailwind CSS v4, icone Lucide, font tipografici *Cinzel*, *Plus Jakarta Sans* e *JetBrains Mono*, animazioni Motion e palette cromatica calda in stile club del fumo (*#120f0e*, *#181210*, *#c99757*, *#8b5e34*).
- **Mobile First & Responsive**: barra di navigazione inferiore fissa (*thumb-zone*) con target di tocco $\ge 44\text{px}$, modal a scorrimento rapido e adattamento fluido per smartphone, tablet e desktop 1440px.

---

## 3. Decisioni Chiave & Problemi Risolti

1. **Fonte Prezzi Ufficiali**:
   - Il sito ADM pubblica determine amministrative in formato PDF non tabellare, soggetto a variazioni di layout.
   - Si utilizza come fonte primaria la **Federazione Italiana Tabaccai (FIT)** (`https://www.tabaccai.it/index.php/servizi/tariffe`), che pubblica i listini in file XLS strutturati per la categoria "Sigari" (codice ADM, denominazione, prezzo confezione, tipo confezione e pezzi).
   - Classificazione automatica della provenienza (*Cuba*, *Italia*, *Extra-Cuba*, *Altro*) dedotta dalla marca.

2. **Evitare il carattere `$` nei file `.env`**:
   - Docker Compose interpreta il simbolo `$` come riferimento a una variabile d'ambiente, sostituendolo silenziosamente con una stringa vuota e causando errori di autenticazione inspiegabili.
   - **Regola inderogabile**: generare sempre password e token con `openssl rand -hex 24` (produce esclusivamente caratteri alfanumerici esadecimali sicuri).

3. **Sezione Impostazioni Modulare & Import/Export Excel**:
   - Organizzata in un **Hub pulito e ordinato con 5 box cliccabili** e **tasto Back** per tornare rapidamente al menu principale senza scrolling chilometrici:
     1. **Location & Microclima**: configurazione contenitori fisici (*Humidor, Giara, Vetro, Tupperdor*) con campioni colore e telemetria °C / % UR.
     2. **Importazione / Esportazione Excel**: esportazione completa in formato **Excel nativo (.xlsx)** e **CSV** di inventario humidor, diario delle fumate e listino FIT ufficiale; importazione massiva con anteprima tabellare interattiva, template pronto all'uso e API batch atomica (`/api/humidor/items/bulk`).
     3. **Home Assistant & Webhooks**: inserimento e salvataggio della chiave segreta `HA_API_KEY`, visualizzazione documentazione YAML e test interattivo delle chiamate webhook.
     4. **Backup Manuale & Snapshot**: esecuzione del backup manuale immediato con download del file `.json` e storico dei ripristini protetti da snapshot preventivo.
     5. **Console Server CLI**: promemoria comandi e documentazione stack.
   - I comandi di gestione e manutenzione del server (`sigari update`, `sigari backup`, `sigari restore`, `sigari scrape`, `sigari status`) si eseguono **esclusivamente da console terminale SSH** con `./cli/sigari <comando>`.

4. **Script di Setup Automatico (`setup.sh`)**:
   - Eseguibile con `./setup.sh` subito dopo `git clone`.
   - **Rilevamento intelligente delle porte libere**: verifica lo stato delle porte su host e su tutti i container Docker attivi (tramite `ss`, `netstat`, `lsof`, socket probe e `docker ps --format '{{.Ports}}'`).
   - Se la porta 3000 è occupata da un altro servizio o container, propone automaticamente la prima porta libera successiva (3001, 3002...) permettendo all'utente di confermare o specificare una porta a scelta.
   - Allinea automaticamente `docker-compose.yml` (`- "${APP_PORT:-<PORT>}:3000"`) e il file `.env` (`APP_PORT=<PORT>`).
   - Genera tutte le chiavi crittografiche pulite (solo esadecimali, nessun `$`).
   - Chiede all'utente le credenziali (email e password) per creare il primo amministratore che avrà accesso all'app e lo salva nel database locale.
   - Prepara le directory locali `data/` e `downloads/backups/` e imposta i permessi `chmod +x`.
   - **Zero dipendenze Node.js sull'host**: le modifiche a `docker-compose.yml` e la scrittura dell'utente in `humidor_db.json` utilizzano comandi nativi POSIX (`sed`, `bash`) con fallback (`python3`/`python`/`sed`), eliminando qualsiasi dipendenza da Node.js sul sistema host.
   - **Stampa finale del riepilogo**: mostra la porta configurata, l'URL locale `http://localhost:<PORT>`, l'URL di rete LAN `http://<IP-LAN>:<PORT>`, le credenziali d'accesso e i comandi CLI.

---

## 4. Struttura del Repository

```
├── .env.example              # Template variabili d'ambiente con avvisi di sicurezza
├── .gitignore                # Regole git (esclude node_modules, dist, .env*, downloads/)
├── .npmrc                    # Configurazione npm (legacy-peer-deps per build stabili)
├── package.json              # Script di avvio e dipendenze
├── package-lock.json         # Lockfile deterministico per npm ci in Docker
├── Dockerfile                # Dockerfile multi-stage per produzione Node 22 (node:22-slim Debian glibc)
├── docker-compose.yml        # Stack con servizi db (Postgres 16) e backend, con healthcheck
├── README.md                 # Documentazione d'uso e installazione rapida
├── HANDOVER.md               # Questo documento di contesto per handover tra chat
├── setup.sh                  # Script interattivo di configurazione iniziale e primo utente
├── server.ts                 # Server Express con tutte le API REST e webhooks
├── package.json              # Script di avvio ("dev": "tsx server.ts", "start": "node server.ts")
├── cli/
│   └── sigari                # Script bash di amministrazione da riga di comando
├── data/
│   └── humidor_db.json       # Database locale / seed iniziale dell'inventario
├── downloads/
│   └── backups/              # Directory di archiviazione dei file di backup JSON
└── src/
    ├── App.tsx               # Root component con gestione tab, modali e notifiche
    ├── main.tsx              # Entry point React
    ├── index.css             # Tailwind CSS v4, varianti dark e font custom
    ├── types/
    │   └── cigar.ts          # Definizioni TypeScript (Product, HumidorItem, Location, Fumata, ecc.)
    ├── data/
    │   ├── cigarCatalog.ts   # Catalogo sigari ufficiali italiani (Cuba, Italia, Extra-Cuba)
    │   └── wikiData.ts       # Dati enciclopedici (anatomia, foglie, colori capa, vitolas)
    ├── assets/images/        # Immagini fotografiche ad alta fedeltà generate per l'app
    └── components/
        ├── Navbar.tsx        # Top navigation bar conforme al 3-Zone Contract
        ├── MobileBottomNav.tsx # Barra di navigazione mobile per thumb-zone (≥44px)
        ├── DashboardTab.tsx  # Dashboard con KPI, trend temporali, top 5 marche e fumate recenti
        ├── HumidorTab.tsx    # Inventario lotti, microclima per location, filtri e fuma-ora
        ├── PricesTab.tsx     # Ricerca prezzi FIT/ADM con indicatori variazioni 180gg
        ├── FumateTab.tsx     # Diario delle fumate con calcolo automatico della durata
        ├── TastingNotesTab.tsx # Schede organolettiche con ruota degli aromi e abbinamenti
        ├── WishlistTab.tsx   # Lista acquisti futuri con totale spesa stimata e preferiti con tag
        ├── WikiTab.tsx       # Enciclopedia visiva (anatomia interattiva, colori, vitolas)
        ├── SettingsTab.tsx   # Impostazioni: location (Humidor/Giara/Vetro), HA API key, backup
        └── modals/
            ├── FumataModal.tsx       # Modale registrazione e modifica fumata con orari, riaccensioni e stelle
            ├── EditHumidorItemModal.tsx # Modale modifica lotti humidor (prezzo acquisto, quantità, location, negozio)
            ├── PurchaseModal.tsx     # Modale nuovo acquisto con prezzi di listino e location
            ├── PriceHistoryModal.tsx # Modale storico prezzi a 5 anni con curva grafica SVG
            └── AIReviewModal.tsx     # Modale sintesi recensioni della community italiana
```

---

## 5. Variabili d'Ambiente (`.env`)

```ini
POSTGRES_USER=tabacchi
POSTGRES_PASSWORD=tabacchi_secret_password_2026   # Nessun '$'!
POSTGRES_DB=tabacchi_prezzi

PORT=3000
NODE_ENV=production

# Scraping automatico settimanale (default: ogni lunedì alle 03:00)
SCRAPE_CRON="0 3 * * 1"
SCRAPE_ON_BOOT=true

ADMIN_TOKEN=sigari_admin_token_2026
JWT_SECRET=sigari_jwt_secret_hex24
HA_API_KEY=ha_token_opzionale
GEMINI_API_KEY=
```

---

## 6. Comandi da Console Server (`cli/sigari`)

| Comando | Descrizione |
| :--- | :--- |
| `./cli/sigari status` | Verifica lo stato dei container Docker, DB Postgres e healthcheck API |
| `./cli/sigari stats` | Mostra metriche veloci su sigari in humidor, valore collezione e fumate |
| `./cli/sigari backup` | Genera un backup timestamped in `downloads/backups/humidor-backup-*.json` |
| `./cli/sigari restore <f>` | Ripristina un backup (crea automaticamente uno snapshot di sicurezza preventivo) |
| `./cli/sigari scrape` | Forza il download dell'ultimo listino prezzi sigari FIT/ADM |
| `./cli/sigari update -y` | Esegue `git fetch`, `git merge`, migrazioni schema e ricompila i container |
| `./cli/sigari logs` | Mostra i log streaming dei container |

---

## 7. Integrazione con Home Assistant

Per aggiornare automaticamente umidità e temperatura di una location (es. ID 1) da Home Assistant, inviare una richiesta POST a:
- `/api/ha/location-humidity` con payload `{"location_id": 1, "umidita": 69.2}`
- `/api/ha/location-temp` con payload `{"location_id": 1, "temperatura": 19.5}`
- Header richiesto: `x-ha-token: <HA_API_KEY>` (configurabile dalla scheda **Impostazioni** dell'app web).

---

## 8. Come Riprendere il Lavoro in una Nuova Chat

Se si apre una nuova conversazione su Claude Code o AI Studio:
1. Leggere questo file `HANDOVER.md` per conoscere lo stack, la struttura dei file e le convenzioni adottate.
2. Eseguire `npm run dev` (o `tsx server.ts`) per avviare il server full-stack sulla porta 3000.
3. Se si apportano modifiche al codice:
   - Verificare sempre la compilazione con `npm run lint` (`tsc --noEmit`).
   - Sincronizzare le modifiche su GitHub con:
     ```bash
     git add .
     git commit -m "Descrizione modifiche"
     git push origin main
     ```
