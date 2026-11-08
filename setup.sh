#!/usr/bin/env bash
# ==============================================================================
# SIGARI TRACK (v2) - Script di Inizializzazione Automatica (setup.sh)
# Repository: https://github.com/mydohome/sigari_v2.git
# ==============================================================================
# Questo script automatizza:
# 1. Verifica porte libere su host e container Docker attivi
# 2. Configurazione della porta su docker-compose.yml e .env
# 3. Generazione di chiavi e token crittografici sicuri (senza '$')
# 4. Creazione del primo utente amministratore per l'accesso web
# 5. Configurazione directory dati, permessi e repository git remoto
# 6. Stampa del riepilogo finale dettagliato con URL di accesso
# ==============================================================================

set -euo pipefail

# Colori per il terminale
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
MAGENTA="\033[0;35m"
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

# ------------------------------------------------------------------------------
# 1. Directory Applicative
# ------------------------------------------------------------------------------
log "Verifica e creazione directory applicative..."
mkdir -p "${APP_DIR}/data"
mkdir -p "${APP_DIR}/downloads/backups"
success "Directory 'data' e 'downloads/backups' pronte."

# ------------------------------------------------------------------------------
# 2. Rilevamento Porte Libere (Host e Container Docker)
# ------------------------------------------------------------------------------
echo
log "Analisi porte di rete su host e container Docker attivi..."

is_port_in_use() {
  local port="$1"

  # A. Controlla socket in ascolto tramite ss (se disponibile)
  if command -v ss >/dev/null 2>&1; then
    if ss -tuln 2>/dev/null | grep -qE "(:|\])${port}\b"; then
      return 0
    fi
  fi

  # B. Controlla tramite netstat (se disponibile)
  if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln 2>/dev/null | grep -qE "(:|\])${port}\b"; then
      return 0
    fi
  fi

  # C. Controlla tramite lsof (se disponibile)
  if command -v lsof >/dev/null 2>&1; then
    if lsof -i :"$port" 2>/dev/null | grep -q ":$port"; then
      return 0
    fi
  fi

  # D. Prova apertura socket diretto su loopback
  if (exec 3<>/dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
    exec 3<&- 2>/dev/null || true
    exec 3>&- 2>/dev/null || true
    return 0
  fi

  # E. Controlla porte esposte da altri container Docker attivi
  if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE "(0\.0\.0\.0|:::|\[::\]|:)${port}->"; then
      return 0
    fi
  fi

  return 1 # Porta libera
}

find_next_free_port() {
  local start_port="${1:-3000}"
  local p="$start_port"
  while is_port_in_use "$p"; do
    p=$((p + 1))
  done
  echo "$p"
}

DEFAULT_PROPOSED_PORT=3000
if is_port_in_use 3000; then
  FIRST_FREE=$(find_next_free_port 3001)
  warn "La porta 3000 risulta occupata (da un servizio di sistema o da un altro container Docker)."
  log "Individuata porta alternativa libera: ${BOLD}${FIRST_FREE}${NC}"
  DEFAULT_PROPOSED_PORT="$FIRST_FREE"
else
  success "Porta standard 3000 verificata e libera."
  DEFAULT_PROPOSED_PORT=3000
fi

# Scelta interattiva o conferma della porta
SELECTED_PORT="$DEFAULT_PROPOSED_PORT"
if [ -t 0 ]; then
  read -r -p "Porta da assegnare all'applicazione web [default: ${DEFAULT_PROPOSED_PORT}]: " USER_CHOSEN_PORT || USER_CHOSEN_PORT=""
  if [ -n "$USER_CHOSEN_PORT" ]; then
    if is_port_in_use "$USER_CHOSEN_PORT"; then
      warn "Attenzione: la porta specificata (${USER_CHOSEN_PORT}) risulta occupata!"
      read -r -p "Vuoi forzare comunque questa porta? [s/N]: " force_port || force_port=""
      case "$force_port" in
        s|S|si|SI|y|Y|yes) SELECTED_PORT="$USER_CHOSEN_PORT" ;;
        *)
          SELECTED_PORT=$(find_next_free_port "$USER_CHOSEN_PORT")
          log "Assegnata automaticamente la prima porta libera successiva: ${SELECTED_PORT}"
          ;;
      esac
    else
      SELECTED_PORT="$USER_CHOSEN_PORT"
    fi
  fi
fi

success "Porta host selezionata per il web: ${BOLD}${SELECTED_PORT}${NC} -> 3000 (container)"

# ------------------------------------------------------------------------------
# 3. Configurazione docker-compose.yml
# ------------------------------------------------------------------------------
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
  log "Allineamento mapping porte in docker-compose.yml..."
  # Assicura che le porte del backend siano parametrizzate con ${APP_PORT:-...}
  if grep -q 'ports:' "$COMPOSE_FILE"; then
    # Aggiorna mapping con porta host dinamica
    node -e "
      const fs = require('fs');
      let content = fs.readFileSync('${COMPOSE_FILE}', 'utf-8');
      content = content.replace(/-\s*\"[0-9]+:3000\"/g, '- \"\${APP_PORT:-${SELECTED_PORT}}:3000\"');
      content = content.replace(/-\s*\"\\\${APP_PORT:-[0-9]+}:3000\"/g, '- \"\${APP_PORT:-${SELECTED_PORT}}:3000\"');
      fs.writeFileSync('${COMPOSE_FILE}', content, 'utf-8');
    "
    success "docker-compose.yml aggiornato con porta: \${APP_PORT:-${SELECTED_PORT}}:3000"
  fi
fi

# ------------------------------------------------------------------------------
# 4. Generazione Chiavi Crittografiche Sicure (senza '$')
# ------------------------------------------------------------------------------
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

# ------------------------------------------------------------------------------
# 5. Configurazione .env
# ------------------------------------------------------------------------------
ENV_FILE="${APP_DIR}/.env"
CREA_ENV=1

if [ -f "$ENV_FILE" ]; then
  warn "File .env già esistente."
  if [ -t 0 ]; then
    read -r -p "Vuoi rigenerare le chiavi e sovrascrivere .env? [s/N]: " risp_env || risp_env=""
    case "$risp_env" in
      s|S|si|SI|y|Y|yes) CREA_ENV=1 ;;
      *)
        CREA_ENV=0
        log "Mantenute le credenziali esistenti, aggiornamento della porta APP_PORT=${SELECTED_PORT}..."
        # Aggiorna o aggiunge APP_PORT nel file .env esistente
        if grep -q '^APP_PORT=' "$ENV_FILE"; then
          sed -i "s/^APP_PORT=.*/APP_PORT=${SELECTED_PORT}/" "$ENV_FILE"
        else
          echo "APP_PORT=${SELECTED_PORT}" >> "$ENV_FILE"
        fi
        ;;
    esac
  else
    CREA_ENV=0
    # In ambiente non interattivo aggiorna APP_PORT
    if grep -q '^APP_PORT=' "$ENV_FILE"; then
      sed -i "s/^APP_PORT=.*/APP_PORT=${SELECTED_PORT}/" "$ENV_FILE"
    else
      echo "APP_PORT=${SELECTED_PORT}" >> "$ENV_FILE"
    fi
  fi
fi

if [ "$CREA_ENV" -eq 1 ]; then
  log "Scrittura nuovo file .env..."
  cat <<EOF > "$ENV_FILE"
# ==============================================================================
# SIGARI TRACK - Variabili d'Ambiente Generate Automaticamente da setup.sh
# ==============================================================================
# Database PostgreSQL (per stack Docker Compose)
POSTGRES_USER=tabacchi
POSTGRES_PASSWORD=${POSTGRES_PASS}
POSTGRES_DB=tabacchi_prezzi

# Porta esposta sull'host (rilevata libera durante il setup)
APP_PORT=${SELECTED_PORT}

# Porta interna applicativa del server Node
PORT=3000
NODE_ENV=production

# Scraping automatico prezzi FIT (ogni lunedì alle 03:00)
SCRAPE_CRON="0 3 * * 1"
SCRAPE_ON_BOOT=true

# Token segreti e crittografici (senza '$' per evitare conflitti con docker compose)
ADMIN_TOKEN=${ADMIN_TOKEN}
JWT_SECRET=${JWT_SECRET}
HA_API_KEY=${HA_KEY}
GEMINI_API_KEY=
EOF
  success "File .env generato con successo (porta APP_PORT=${SELECTED_PORT}, chiavi sicure)."
fi

# ------------------------------------------------------------------------------
# 6. Creazione del Primo Utente Amministratore Web
# ------------------------------------------------------------------------------
echo
echo -e "${BOLD}--- Configurazione Primo Utente Web ---${NC}"
DEFAULT_EMAIL="admin@sigari.local"

if [ -t 0 ]; then
  read -r -p "Inserisci l'email per il primo utente [default: ${DEFAULT_EMAIL}]: " USER_EMAIL || USER_EMAIL=""
  USER_EMAIL="${USER_EMAIL:-$DEFAULT_EMAIL}"

  USER_PASS=""
  while [ -z "$USER_PASS" ]; do
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
  done
else
  USER_EMAIL="${DEFAULT_EMAIL}"
  USER_PASS="adminpass2026"
fi

# Inserimento utente nel database locale JSON
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
success "Primo utente web '${USER_EMAIL}' registrato con successo!"

# ------------------------------------------------------------------------------
# 7. Permessi Eseguibili
# ------------------------------------------------------------------------------
log "Configurazione permessi script..."
chmod +x "${APP_DIR}/cli/sigari" "${APP_DIR}/setup.sh"
success "Permessi di esecuzione assegnati a cli/sigari e setup.sh."

# ------------------------------------------------------------------------------
# 8. Rilevamento IP Host per il Riepilogo
# ------------------------------------------------------------------------------
get_host_ip() {
  local ip=""
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  if [ -z "$ip" ] && command -v ip >/dev/null 2>&1; then
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
  fi
  echo "${ip:-127.0.0.1}"
}
HOST_IP=$(get_host_ip)

# ------------------------------------------------------------------------------
# 9. Riepilogo Finale
# ------------------------------------------------------------------------------
echo
echo -e "${GREEN}==========================================================${NC}"
echo -e "${BOLD}       INSTALLAZIONE & SETUP COMPLETATI CON SUCCESSO! 🎉${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo
echo -e "${BOLD}Rete & Porte Configurate:${NC}"
echo -e "  • Porta Server Web Host:  ${BOLD}${MAGENTA}${SELECTED_PORT}${NC} -> 3000 (Container Docker)"
echo -e "  • URL Locale (questo PC): ${CYAN}http://localhost:${SELECTED_PORT}${NC}"
if [ "$HOST_IP" != "127.0.0.1" ]; then
  echo -e "  • URL da Rete Locale LAN: ${CYAN}http://${HOST_IP}:${SELECTED_PORT}${NC}"
fi
echo
echo -e "${BOLD}Credenziali di Accesso Web:${NC}"
echo -e "  • Email:    ${BOLD}${USER_EMAIL}${NC}"
echo -e "  • Password: ${BOLD}(impostata durante il setup)${NC}"
echo -e "  • HA Token: ${YELLOW}${HA_KEY}${NC}"
echo
echo -e "${BOLD}Comandi Gestione Server (eseguire solo da console SSH):${NC}"
echo -e "  • Avvio stack Docker:    ${BOLD}docker compose up -d --build${NC}"
echo -e "  • Stato dei servizi:     ${BOLD}./cli/sigari status${NC}"
echo -e "  • Backup manuale DB:     ${BOLD}./cli/sigari backup${NC}"
echo -e "  • Scraping listini FIT:  ${BOLD}./cli/sigari scrape${NC}"
echo -e "  • Aggiornamento git:     ${BOLD}./cli/sigari update -y${NC}"
echo
echo -e "${BOLD}Sincronizzazione GitHub:${NC}"
echo -e "  ${BOLD}git add .${NC}"
echo -e "  ${BOLD}git commit -m \"Allineamento setup e porta server\"${NC}"
echo -e "  ${BOLD}git push -u origin main${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo
