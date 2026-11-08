#!/usr/bin/env bash
# ==============================================================================
# SIGARI TRACK (v2) - Script di Inizializzazione Automatica (setup.sh)
# Repository: https://github.com/mydohome/sigari_v2.git
# ==============================================================================
# Questo script automatizza:
# 1. Generazione di chiavi e token crittografici sicuri (senza '$')
# 2. Creazione del file .env di produzione
# 3. Creazione del primo utente amministratore per l'accesso web
# 4. Configurazione directory dati, permessi e repository git remoto
# ==============================================================================

set -euo pipefail

# Colori per il terminale
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
NC="\033[0m"

log() { echo -e "${CYAN}[SETUP]${NC} $*"; }
success() { echo -e "${GREEN}✔${NC} $*"; }
warn() { echo -e "${YELLOW}▲${NC} $*"; }
error() { echo -e "${RED}✖${NC} $*"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "${BOLD}"
echo "=========================================================="
echo "    🍂 SIGARI TRACK (v2) - Installazione & Setup"
echo "    Gestione Humidor, Prezzi FIT & Note di Degustazione"
echo "=========================================================="
echo -e "${NC}"

# 1. Crea cartelle necessarie
log "Verifica e creazione directory applicative..."
mkdir -p "${APP_DIR}/data"
mkdir -p "${APP_DIR}/downloads/backups"
success "Directory 'data' e 'downloads/backups' pronte."

# 2. Genera chiavi crittografiche pulite (solo caratteri esadecimali, nessun '$')
log "Generazione chiavi crittografiche sicure..."
gen_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

JWT_SECRET=$(gen_key)
ADMIN_TOKEN=$(gen_key)
POSTGRES_PASS=$(gen_key)
HA_KEY=$(gen_key)

# 3. Configura .env
ENV_FILE="${APP_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
  warn "File .env già esistente."
  read -r -p "Vuoi rigenerare le chiavi e sovrascrivere .env? [s/N]: " risp_env || risp_env=""
  case "$risp_env" in
    s|S|si|SI|y|Y|yes) CREA_ENV=1 ;;
    *) CREA_ENV=0; log "Mantenuto il file .env esistente." ;;
  esac
else
  CREA_ENV=1
fi

if [ "${CREA_ENV:-0}" -eq 1 ]; then
  log "Scrittura nuovo file .env..."
  cat <<EOF > "$ENV_FILE"
# ==============================================================================
# SIGARI TRACK - Variabili d'Ambiente Generate Automaticamente
# ==============================================================================
POSTGRES_USER=tabacchi
POSTGRES_PASSWORD=${POSTGRES_PASS}
POSTGRES_DB=tabacchi_prezzi

PORT=3000
NODE_ENV=production

SCRAPE_CRON="0 3 * * 1"
SCRAPE_ON_BOOT=true

ADMIN_TOKEN=${ADMIN_TOKEN}
JWT_SECRET=${JWT_SECRET}
HA_API_KEY=${HA_KEY}
GEMINI_API_KEY=
EOF
  success "File .env generato con successo (password e token sicuri senza '$')."
fi

# 4. Creazione del primo utente per l'accesso web
echo
echo -e "${BOLD}--- Configurazione Primo Utente Web ---${NC}"
DEFAULT_EMAIL="admin@sigari.local"

read -r -p "Inserisci l'email per il primo utente [default: ${DEFAULT_EMAIL}]: " USER_EMAIL || USER_EMAIL=""
USER_EMAIL="${USER_EMAIL:-$DEFAULT_EMAIL}"

# Prompt password
USER_PASS=""
while [ -z "$USER_PASS" ]; do
  if [ -t 0 ]; then
    read -r -s -p "Inserisci la password per ${USER_EMAIL}: " USER_PASS
    echo
    read -r -s -p "Conferma la password: " USER_PASS_CONFIRM
    echo
    if [ "$USER_PASS" != "$USER_PASS_CONFIRM" ]; then
      error "Le password non coincidono. Riprova."
      USER_PASS=""
    elif [ ${#USER_PASS} -lt 4 ]; then
      error "La password deve contenere almeno 4 caratteri."
      USER_PASS=""
    fi
  else
    USER_PASS="adminpass2026"
  fi
done

# Inserimento utente nel database JSON
DB_FILE="${APP_DIR}/data/humidor_db.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log "Salvataggio utente amministratore '${USER_EMAIL}'..."
node -e "
const fs = require('fs');
const path = '${DB_FILE}';
let db = {};
if (fs.existsSync(path)) {
  try { db = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch(e){}
}
if (!db.users) db.users = [];
if (!db.config) db.config = {};

db.config.ha_api_key = '${HA_KEY}';
db.config.admin_token = '${ADMIN_TOKEN}';

const cleanEmail = '${USER_EMAIL}'.trim().toLowerCase();
const idx = db.users.findIndex(u => u.email === cleanEmail);
const record = {
  id: idx !== -1 ? db.users[idx].id : (db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1),
  email: cleanEmail,
  password_hash: 'plain:${USER_PASS}',
  role: 'admin',
  created_at: '${NOW}'
};
if (idx !== -1) {
  db.users[idx] = record;
} else {
  db.users.push(record);
}
fs.writeFileSync(path, JSON.stringify(db, null, 2), 'utf-8');
console.log('Utente salvato nel database locale.');
"
success "Primo utente web '${USER_EMAIL}' creato con successo!"

# 5. Configurazione permessi eseguibili
log "Configurazione permessi script..."
chmod +x "${APP_DIR}/cli/sigari" "${APP_DIR}/setup.sh"
success "Permessi di esecuzione assegnati a cli/sigari e setup.sh."

# 6. Configurazione repository Git remoto v2
echo
log "Verifica repository Git remoto..."
NEW_REPO_URL="https://github.com/mydohome/sigari_v2.git"

if [ -d ".git" ]; then
  CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
  if [ "$CURRENT_REMOTE" != "$NEW_REPO_URL" ]; then
    log "Aggiornamento remote git origin a: ${NEW_REPO_URL}"
    git remote set-url origin "$NEW_REPO_URL" 2>/dev/null || git remote add origin "$NEW_REPO_URL"
    success "Remote origin impostato su ${NEW_REPO_URL}"
  else
    success "Remote origin è già impostato correttamente su ${NEW_REPO_URL}"
  fi
else
  log "Inizializzazione repository git locale..."
  git init -b main
  git remote add origin "$NEW_REPO_URL"
  success "Git inizializzato con remote: ${NEW_REPO_URL}"
fi

# 7. Riepilogo Finale
echo
echo -e "${GREEN}==========================================================${NC}"
echo -e "${BOLD}       INSTALLAZIONE COMPLETATA CON SUCCESSO! 🎉${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo
echo "Credenziali di accesso Web:"
echo -e "  • Email:    ${BOLD}${USER_EMAIL}${NC}"
echo -e "  • Password: ${BOLD}(impostata)${NC}"
echo -e "  • HA Token: ${CYAN}${HA_KEY}${NC}"
echo
echo "Comandi utili da console server:"
echo -e "  • Avvio con Docker:    ${BOLD}docker compose up -d --build${NC}"
echo -e "  • Stato dei servizi:   ${BOLD}./cli/sigari status${NC}"
echo -e "  • Backup manuale:      ${BOLD}./cli/sigari backup${NC}"
echo -e "  • Scraping listini:    ${BOLD}./cli/sigari scrape${NC}"
echo -e "  • Aggiornamento git:   ${BOLD}./cli/sigari update -y${NC}"
echo
echo "Per inviare il codice al tuo repository GitHub:"
echo -e "  ${BOLD}git add .${NC}"
echo -e "  ${BOLD}git commit -m \"Sigari v2: Nuova UI, Impostazioni e Setup automatico\"${NC}"
echo -e "  ${BOLD}git push -u origin main${NC}"
echo
