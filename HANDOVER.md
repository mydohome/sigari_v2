# Documento di Handover: Sigari Track (v2) 🍂

Questo documento sintetizza lo stato completo dell'applicazione, le scelte architetturali, lo stack Docker, le funzionalità implementate e le istruzioni operative per riprendere lo sviluppo in qualsiasi momento su una nuova chat o sessione.

---

## 1. Cos'è il Progetto
**Sigari Track (v2)** è una piattaforma web responsive (ottimizzata per smartphone, tablet e desktop) e containerizzata con Docker per:
1. **Monitorare i prezzi ufficiali dei sigari in Italia** pubblicati dalla Federazione Italiana Tabaccai (FIT) per conto di ADM (Agenzia delle Dogane e dei Monopoli), con rilevazione delle variazioni negli ultimi 180 giorni e grafico storico fino a 5 anni.
2. **Gestire l'inventario personale dei sigari (Humidor)**: lotti, quantità residue, prezzo d'acquisto (con modifica rapida degli importi), date e negozi/tabaccherie di provenienza.
3. **Supervisionare il microclima dei contenitori**: monitoraggio temperatura (°C) e umidità (% UR) per location distinte (*Humidor in Cedro*, *Giara Vetro Toscani*, *Tupperdor d'Invecchiamento*, ecc.), predisposto per l'integrazione IoT con **Home Assistant**.
4. **Tenere un diario delle degustazioni (Fumate)**: orari di inizio/fine con calcolo automatico della durata, conteggio riaccensioni, abbinamenti e note personali, con possibilità sia di **modifica completa** che di annullamento (con reintegro automatico della giacenza).
5. **Redigere schede sensoriali**: valutazione a stelle, ruota degli aromi (*cedro, cuoio, pepe, cacao, caffè, terra, ecc.*), forza, combustione e tiraggio, con sintesi AI delle opinioni dei club italiani di fumo lento (*GustoTabacco*, *Accademia del Fumo Lento*, *Bottega del Fumatore*).
6. **Pianificare acquisti con Wishlist e Preferiti**: calcolo automatico della spesa preventivata e tag personalizzati.
7. **Consultare una Guida & Enciclopedia**: anatomia del sigaro in 7 punti, foglie della tripa (*Volado*, *Seco*, *Ligero*), scala colori della capa e vitolario.

- **Repository GitHub**: [https://github.com/mydohome/sigari_v2.git](https://github.com/mydohome/sigari_v2.git)

---

## 2. Architettura & Stack Tecnologico

- **Backend**: Node.js 22 + Express (TypeScript con runtime `tsx`), che espone API REST complete per tutte le entità (`/api/prices/*`, `/api/catalog/*`, `/api/humidor/*`, `/api/settings/*`, `/api/auth/*`, `/api/ha/*`).
- **Database & Storage**:
  - In ambiente Docker di produzione: container PostgreSQL 16 Alpine (`sigari-db`) con volume persistente `sigari_db_data`, isolato sulla rete privata interna `sigari_internal_network` senza esposizione della porta 5432 sull'host (eliminando qualsiasi conflitto con Postgres preesistenti sul server).
  - In ambiente server/sviluppo: storage JSON transazionale auto-migrante in `data/humidor_db.json`, esportabile e ripristinabile al 100% come dump/snapshot.
- **Frontend**: Single Page Application React 19 + TypeScript, bundler Vite, utility Tailwind CSS v4, icone Lucide, font tipografici *Cinzel*, *Plus Jakarta Sans* e *JetBrains Mono*, animazioni Motion e palette cromatica calda in stile club del fumo (*#120f0e*, *#181210*, *#c99757*, *#8b5e34*).
- **Mobile First & Responsive**: barra di navigazione inferiore fissa (*thumb-zone*) con target di tocco $\ge 44\text{px}$, modal a scorrimento rapido e adattamento fluido per smartphone, tablet e desktop 1440px.

---

## 3. Decisioni Chiave & Funzionalità Risolte

1. **Fonte Prezzi Ufficiali FIT / ADM**:
   - In Italia la tariffa di vendita al pubblico è determinata da ADM e pubblicata da FIT.
   - Il catalogo pre-caricato include oltre **88+ referenze ufficiali** registrate nei monopoli italiani (*Cuba*, *Italia*, *Extra-Cuba Caraibi*).
   - **Come scaricare il listino ufficiale FIT/ADM**:
     1. Dal sito **ADM** (`www.adm.gov.it`): Sezione *Monopoli > Tabacchi > Prezzi e tariffe di vendita al pubblico* (foglio "Sigari e Sigaretti" in Excel `.xlsx`).
     2. Dal sito **FIT** (`www.tabaccai.it`): Sezione *Servizi > Tariffe tabacchi lavorati*.
   - **Due modalità di sincronizzazione implementate**:
     - *Online 1-Click*: Pulsante **"Sincronizza Listino Completo FIT Online"** in Impostazioni > Excel oppure comando console `./cli/sigari scrape`.
     - *Upload File Excel*: Riquadro drag & drop in Impostazioni per caricare il file scaricato da ADM/FIT; il parser rileva automaticamente colonne Codice, Denominazione, Confezione e Prezzi e aggiorna il catalogo in tempo reale.

2. **Installazione Pulita (Zero Dati di Test Fittizi) & Pulsante di Reset**:
   - `data/humidor_db.json` e la funzione `getInitialDB()` in `server.ts` partono con inventario (`items`), diario (`fumate`), recensioni (`reviews`), preferiti e wishlist **completamente vuoti**, lasciando le location fisiche predefinite pronte per i veri sigari del collezionista.
   - Disponibile l'endpoint `POST /api/humidor/reset-test-data`, il pulsante nella sezione **Backup** dell'app web (*"Azzera Dati di Prova"*) e il comando console `./cli/sigari reset-test-data` per ripulire i dati di test in qualsiasi momento preservando contenitori, tabaccherie e impostazioni.

3. **Sezione Impostazioni Modulare & Import/Export Excel**:
   - Organizzata in un **Hub ordinato con 5 box cliccabili** e **tasto Back** per navigare comodamente:
     1. **Location & Microclima**: configurazione contenitori fisici (*Humidor, Giara, Vetro, Tupperdor*) con campioni colore e telemetria °C / % UR.
     2. **Importazione / Esportazione Excel**: esportazione completa in formato **Excel nativo (.xlsx)** e **CSV** di humidor, diario fumate e listino FIT; importazione massiva con anteprima tabellare e template pre-compilato; sincronizzazione del listino ufficiale FIT e upload file tariffa ADM.
     3. **Home Assistant & Webhooks**: inserimento e salvataggio della chiave segreta `HA_API_KEY`, visualizzazione documentazione YAML e test interattivo delle chiamate webhook.
     4. **Backup Manuale & Snapshot**: esecuzione del backup manuale immediato con download del file `.json` e pulsante per azzerare i dati di prova.
     5. **Console Server CLI**: promemoria comandi e documentazione stack.

4. **Script di Setup Automatico (`setup.sh`)**:
   - Rileva automaticamente le porte libere sull'host e sui container Docker.
   - Parametrizza `docker-compose.yml` (`- "${APP_PORT:-<PORT>}:3000"`) e `.env`.
   - Genera password esadecimali sicure (senza il carattere `$` che romperebbe Docker Compose).
   - Zero dipendenze Node.js sull'host: usa comandi nativi POSIX (`sed`, `bash`) con fallback `python3`/`python`.
   - Stampa finale del riepilogo con URL locale, URL di rete LAN e credenziali.

5. **Configurazione Porte e Rete**:
   - Server Node.js configurato internamente sulla porta 3000 fissa (`PORT = 3000`) per piena conformità con AI Studio e container Docker.

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
├── handover.md               # Copia di riserva per handover tra chat
├── setup.sh                  # Script interattivo di configurazione iniziale e primo utente
├── server.ts                 # Server Express con tutte le API REST e webhooks (porta 3000)
├── cli/
│   └── sigari                # Script bash di amministrazione da riga di comando
├── data/
│   └── humidor_db.json       # Database locale pulito / seed iniziale dell'inventario
├── downloads/
│   └── backups/              # Directory di archiviazione dei file di backup JSON
└── src/
    ├── App.tsx               # Root component con gestione tab, modali e notifiche
    ├── main.tsx              # Entry point React
    ├── index.css             # Tailwind CSS v4, varianti dark e font custom
    ├── types/
    │   └── cigar.ts          # Definizioni TypeScript (Product, HumidorItem, Location, Fumata, ecc.)
    ├── data/
    │   ├── cigarCatalog.ts   # Catalogo oltre 88+ sigari ufficiali italiani (Cuba, Italia, Extra-Cuba)
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
        ├── SettingsTab.tsx   # Impostazioni modulari in 5 sezioni con tasto back
        └── modals/
            ├── FumataModal.tsx       # Modale registrazione e modifica completa fumata
            ├── EditHumidorItemModal.tsx # Modale modifica lotti humidor (prezzo acquisto, quantità, location)
            ├── PurchaseModal.tsx     # Modale nuovo acquisto con prezzi di listino e location
            ├── PriceHistoryModal.tsx # Modale storico prezzi a 5 anni con curva grafica SVG
            └── AIReviewModal.tsx     # Modale sintesi recensioni della community italiana
```

---

## 5. Comandi da Console Server (`cli/sigari`)

| Comando | Descrizione |
| :--- | :--- |
| `./cli/sigari status` | Verifica lo stato dei container Docker, DB Postgres e healthcheck API |
| `./cli/sigari stats` | Mostra metriche veloci su sigari in humidor, valore collezione e fumate |
| `./cli/sigari backup` | Genera un backup timestamped in `downloads/backups/humidor-backup-*.json` |
| `./cli/sigari restore <f>` | Ripristina un backup (crea automaticamente uno snapshot di sicurezza preventivo) |
| `./cli/sigari scrape` | Forza la sincronizzazione dell'intero listino prezzi sigari FIT/ADM |
| `./cli/sigari reset-test-data` | Elimina tutti i dati di prova lasciando intatte location, configurazioni e utenti |
| `./cli/sigari update -y` | Esegue `git fetch`, `git merge`, migrazioni schema e ricompila i container |
| `./cli/sigari logs` | Mostra i log streaming dei container |

---

## 6. Integrazione con Home Assistant

Per aggiornare automaticamente umidità e temperatura di una location (es. ID 1) da Home Assistant, inviare una richiesta POST a:
- `/api/ha/location-humidity` con payload `{"location_id": 1, "umidita": 69.2}`
- `/api/ha/location-temp` con payload `{"location_id": 1, "temperatura": 19.5}`
- Header richiesto: `x-ha-token: <HA_API_KEY>` (configurabile dalla scheda **Impostazioni** dell'app web).
