# Sigari Track (v2) 🍂

Applicazione web moderna e stack Docker per il monitoraggio dei **prezzi ufficiali dei sigari in Italia** (listini FIT/ADM), gestione dell'**inventario humidor**, diario delle **fumate** e **note di degustazione personali**, con dashboard statistica e telemetria microclimatica (Home Assistant).

Repository ufficiale: [https://github.com/mydohome/sigari_v2.git](https://github.com/mydohome/sigari_v2.git)

---

## 🚀 Avvio Rapido con `setup.sh`

Subito dopo aver clonato il repository, esegui lo script di configurazione guidata:

```bash
git clone https://github.com/mydohome/sigari_v2.git
cd sigari_v2
./setup.sh
```

Lo script `setup.sh` automatizza interamente la configurazione:
1. **Generazione delle chiavi crittografiche** sicure (`JWT_SECRET`, `ADMIN_TOKEN`, `POSTGRES_PASSWORD`, `HA_API_KEY`) rigorosamente prive del carattere `$` (che in Docker Compose verrebbe interpretato come variabile).
2. **Creazione del file `.env`** di produzione.
3. **Creazione interattiva del primo utente** amministratore che avrà accesso all'applicazione web.
4. **Predisposizione delle directory** per il database persistente (`data/`) e i backup (`downloads/backups/`).
5. **Configurazione dei permessi di esecuzione** per gli script CLI (`./cli/sigari` e `./setup.sh`).

---

## 🐳 Avvio dello Stack Docker

Avvia tutti i servizi (backend Node.js, database PostgreSQL e volumi persistenti) in un unico comando:

```bash
docker compose up -d --build
```

- **Interfaccia Web**: [http://localhost:3000](http://localhost:3000)
- **API Backend**: [http://localhost:3000/api](http://localhost:3000/api)
- **Database PostgreSQL**: Rete interna Docker privata `sigari_internal_network` (non esposto sull'host per evitare conflitti di porta)

---

## 🖥️ Comandi di Gestione da Console Server (`cli/sigari`)

I comandi di manutenzione e gestione vengono eseguiti **esclusivamente da console terminale** sul server tramite lo script `./cli/sigari`:

```bash
# Mostra lo stato dei container Docker, DB e endpoint di salute
./cli/sigari status

# Stampa statistiche veloci dell'humidor (giacenza, valore collezione, fumate)
./cli/sigari stats

# Crea un backup immediato in formato JSON compresso
./cli/sigari backup

# Ripristina uno snapshot salvato (con backup di sicurezza preventivo automatico)
./cli/sigari restore humidor-backup-YYYYMMDD_HHMMSS.json

# Scarica i listini ufficiali più recenti da tabaccai.it (FIT / ADM)
./cli/sigari scrape

# Scarica i nuovi commit da origin/main, applica migrazioni e ricompila i container
./cli/sigari update -y

# Visualizza i log in tempo reale dei container
./cli/sigari logs
```

---

## 📱 Funzionalità dell'Applicazione Web

- **Dashboard Statistica Interattiva**:
  - Indicatori KPI su sigari in giacenza, valore totale stimato, spesa investita e media fumate settimanali/mensili.
  - Grafici di consumo temporale interattivi (settimanale e mensile).
  - Ripartizione della collezione per origine geografica (*Cuba*, *Italia / Toscani*, *Extra-Cuba*) e top 5 delle marche preferite.
  - Feed delle sessioni di fumo recenti con durata e rating.

- **Humidor & Microclima**:
  - Tracciamento dei singoli lotti di sigari con data d'acquisto, tabaccheria di provenienza, prezzo d'acquisto e prezzo ufficiale FIT odierno.
  - Azione rapida "Fuma Ora", cambio giacenza e spostamento tra location.

- **Scheda Impostazioni Web**:
  - **Gestione Location**: aggiungi, modifica colore e nome dei contenitori fisici (*Humidor Cedro*, *Giara Vetro Toscani*, *Tupperdor*).
  - **Integrazione Home Assistant**: configura la chiave `HA_API_KEY`, visualizza snippet YAML per automazioni e testa l'invio delle letture di temperatura e umidità.
  - **Backup Manuale**: pulsante in evidenza per eseguire un backup manuale istantaneo, con download del file JSON e archivio storico.

- **Listini Ufficiali FIT / ADM**:
  - Ricerca con autocompletamento marca, categorie e filtri origine.
  - Indicatori di variazione prezzo a 180 giorni.
  - Grafico storico fino a 5 anni con documenti ufficiali di determina.

- **Diario Fumate & Note di Degustazione**:
  - Calcolo automatico della durata della fumata con orari inizio/fine.
  - Ruota degli aromi, livello di forza, combustione, tiraggio e abbinamento con distillati/caffè.

- **Wishlist & Preferiti**:
  - Pianificazione acquisti con calcolo spesa totale per il prossimo rifornimento.
  - Preferiti raggruppati con tag personalizzati (*"Da riprovare"*, *"Occasioni speciali"*).

- **Guida & Enciclopedia**:
  - Anatomia del sigaro in 7 punti, tipologie di foglie della tripa (*Volado*, *Seco*, *Ligero*), spettro delle cape e formati vitolas.

---

## 📤 Push su GitHub

Per sincronizzare il codice con il tuo repository GitHub:

```bash
git add .
git commit -m "Sigari v2: Nuova UI, Tab Impostazioni, setup.sh e comandi CLI da console"
git branch -M main
git push -u origin main
```
