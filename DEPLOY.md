# Deploy na Hostinger VPS

Guia passo-a-passo pra deploy em produção. Pressupõe que você tem:
- Uma VPS Hostinger com Ubuntu 22.04+ (ou 24.04)
- Acesso SSH como root (ou usuário sudoer)
- Um domínio apontando pra ela (ex: `fecot.com.br` e `api.fecot.com.br`)

A arquitetura será:

```
  Internet
     │
     ▼
  nginx (porta 80/443, SSL Let's Encrypt)
     │
     ├─── fecot.com.br     ──► Next.js (porta 3000, systemd)
     └─── api.fecot.com.br ──► FastAPI/Uvicorn (porta 3002, systemd)
                                      │
                                      ▼
                              PostgreSQL (local, porta 5432)
```

---

## 1) Preparar a VPS (primeira vez)

Conecte por SSH:
```bash
ssh root@seu-ip-da-vps
```

Atualize o sistema e crie um usuário não-root:
```bash
apt update && apt upgrade -y
adduser fecot
usermod -aG sudo fecot

# Copia sua chave SSH pro novo usuário (opcional mas recomendado)
rsync --archive --chown=fecot:fecot ~/.ssh /home/fecot

# Sai e reconecta como fecot
exit
ssh fecot@seu-ip-da-vps
```

Instale as dependências:
```bash
sudo apt install -y \
  python3.12 python3.12-venv python3-pip \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  git curl build-essential libpq-dev \
  ufw

# Node 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirma versões
python3.12 --version
node --version
psql --version
nginx -v
```

Firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 2) Configurar o PostgreSQL

```bash
sudo -u postgres psql
```

No prompt do psql:
```sql
CREATE USER fecot WITH PASSWORD 'TROQUE-POR-UMA-SENHA-FORTE';
CREATE DATABASE fecot_prod OWNER fecot;
GRANT ALL PRIVILEGES ON DATABASE fecot_prod TO fecot;
\q
```

Teste a conexão:
```bash
psql -U fecot -d fecot_prod -h localhost -W
# (digite a senha; se conectar, \q pra sair)
```

> **Dica:** guarde a senha do Postgres num lugar seguro — ela vai no `.env` do backend.

---

## 3) Clonar o projeto

```bash
cd /home/fecot
git clone https://github.com/mezhack/fecot-platform.git
cd fecot-platform
```

---

## 4) Deploy do backend (FastAPI)

### 4.1 Venv e dependências

```bash
cd /home/fecot/fecot-platform/backend

python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e .
```

### 4.2 Configurar `.env` de produção

```bash
cp .env.example .env
nano .env
```

Valores críticos:
```env
APP_ENV=production
DEBUG=false

HOST=127.0.0.1
PORT=3002

# Use a senha que você definiu no Postgres
DATABASE_URL=postgresql+psycopg2://fecot:SUA-SENHA-FORTE@localhost:5432/fecot_prod

# Gere um segredo forte:
#   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
JWT_SECRET=cole-aqui-o-segredo-gerado
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Exatamente os domínios que o frontend vai usar
CORS_ORIGINS=https://fecot.com.br,https://www.fecot.com.br
```

### 4.3 Rodar migrations

```bash
alembic upgrade head
```

### 4.4 Criar pasta de uploads (avatares)

A API salva fotos de perfil em disco. Precisamos criar e dar permissão:

```bash
sudo mkdir -p /var/lib/fecot/uploads/avatars
sudo chown -R fecot:fecot /var/lib/fecot
sudo chmod 755 /var/lib/fecot /var/lib/fecot/uploads
```

E ajustar o `.env` do backend:
```env
UPLOAD_DIR=/var/lib/fecot/uploads
UPLOAD_PUBLIC_PREFIX=/uploads
AVATAR_MAX_MB=5
AVATAR_MAX_SIZE=512
```

### 4.5 Popular dados iniciais (APENAS na primeira vez)

```bash
python -m scripts.seed
```

> ⚠️ O seed **limpa** os dados existentes. Use só no primeiro deploy. Depois disso, nunca mais.

Após esse primeiro seed, entre no painel e **troque imediatamente todas as senhas default** (elas são os CPFs, fáceis de adivinhar).

### 4.6 Systemd service

Crie o arquivo:
```bash
sudo nano /etc/systemd/system/fecot-backend.service
```

Conteúdo:
```ini
[Unit]
Description=FECOT Backend (FastAPI)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=fecot
Group=fecot
WorkingDirectory=/home/fecot/fecot-platform/backend
Environment="PATH=/home/fecot/fecot-platform/backend/.venv/bin"
EnvironmentFile=/home/fecot/fecot-platform/backend/.env
ExecStart=/home/fecot/fecot-platform/backend/.venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 --port 3002 --workers 2
Restart=on-failure
RestartSec=5

# Hardening básico
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Ativa e inicia:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fecot-backend
sudo systemctl start fecot-backend
sudo systemctl status fecot-backend
```

Teste local:
```bash
curl http://127.0.0.1:3002/api/health
# { "status": "ok", "database": "ok" }
```

Logs (em tempo real):
```bash
sudo journalctl -u fecot-backend -f
```

---

## 5) Deploy do frontend (Next.js)

### 5.1 Instalar deps e configurar env

```bash
cd /home/fecot/fecot-platform/frontend

npm install

# Cria .env.local com a URL pública da API
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=https://api.fecot.com.br
EOF
```

### 5.2 Build de produção

```bash
npm run build
```

Se der erro sobre `Failed to fetch Inter from Google Fonts`, é porque sua VPS está com acesso restrito ao Google. Se isso acontecer, baixe as fontes e use `next/font/local` em `app/layout.tsx` (ou instale via CDN).

### 5.3 Systemd service do frontend

```bash
sudo nano /etc/systemd/system/fecot-frontend.service
```

```ini
[Unit]
Description=FECOT Frontend (Next.js)
After=network.target fecot-backend.service

[Service]
Type=simple
User=fecot
Group=fecot
WorkingDirectory=/home/fecot/fecot-platform/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="HOSTNAME=127.0.0.1"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable fecot-frontend
sudo systemctl start fecot-frontend
sudo systemctl status fecot-frontend
```

Teste local:
```bash
curl -I http://127.0.0.1:3000
# deve retornar HTTP 200
```

---

## 6) Nginx como reverse proxy

### 6.1 Configuração inicial (HTTP, antes do SSL)

Configuração do backend (`api.fecot.com.br`):
```bash
sudo nano /etc/nginx/sites-available/fecot-api
```

```nginx
server {
    listen 80;
    server_name api.fecot.com.br;

    # Aceita até 6 MB de upload (limite de avatar é 5 MB + folga)
    client_max_body_size 6M;

    # Uploads (avatares) — servidos direto pelo nginx pra performance
    # (bypassa o uvicorn; cache de 30 dias no browser)
    location /uploads/ {
        alias /var/lib/fecot/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Configuração do frontend (`fecot.com.br`):
```bash
sudo nano /etc/nginx/sites-available/fecot-frontend
```

```nginx
server {
    listen 80;
    server_name fecot.com.br www.fecot.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Ativa e recarrega:
```bash
sudo ln -s /etc/nginx/sites-available/fecot-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/fecot-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Abra no navegador `http://fecot.com.br` — já deve estar no ar (sem SSL ainda).

### 6.2 SSL com Let's Encrypt

Antes de rodar, **confirme que o DNS está propagado** — `dig fecot.com.br +short` tem que retornar o IP da sua VPS. Propagação costuma levar de minutos a algumas horas.

```bash
sudo certbot --nginx -d fecot.com.br -d www.fecot.com.br -d api.fecot.com.br
```

O certbot vai:
- Validar os domínios
- Editar os arquivos nginx pra servir HTTPS (porta 443)
- Configurar redirect automático de HTTP → HTTPS
- Criar um job de renovação automática (`/etc/cron.d/certbot` ou timer systemd)

Teste a renovação sem recarregar:
```bash
sudo certbot renew --dry-run
```

---

## 7) Passos pós-deploy (importantes)

### 7.1 Trocar as senhas dos usuários seed

No painel da FECOT, faça login como admin e **troque imediatamente as senhas** de todos os usuários criados pelo seed (elas são os CPFs públicos).

### 7.2 Backups automáticos do banco

Crie um script de backup:
```bash
sudo mkdir -p /var/backups/fecot
sudo nano /usr/local/bin/fecot-backup.sh
```

```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/var/backups/fecot
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD='SUA-SENHA-DO-POSTGRES' pg_dump -U fecot -h localhost fecot_prod \
  | gzip > "$BACKUP_DIR/fecot_${DATE}.sql.gz"

# Backup dos uploads (avatares)
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C /var/lib/fecot uploads/

# mantém só os últimos 14 backups
ls -tp "$BACKUP_DIR"/fecot_*.sql.gz | tail -n +15 | xargs -r rm --
ls -tp "$BACKUP_DIR"/uploads_*.tar.gz | tail -n +15 | xargs -r rm --
```

```bash
sudo chmod +x /usr/local/bin/fecot-backup.sh

# agenda diário às 3h da manhã
sudo crontab -e
# adicione a linha:
0 3 * * * /usr/local/bin/fecot-backup.sh
```

### 7.3 Monitorar logs

```bash
# Backend
sudo journalctl -u fecot-backend -f

# Frontend
sudo journalctl -u fecot-frontend -f

# Nginx
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

---

## 8) Fluxo de atualização (depois de mexer no código)

Seu fluxo padrão pra deploy de novas versões:

```bash
ssh fecot@seu-ip-da-vps
cd /home/fecot/fecot-platform
git pull

# --- Backend (se houve mudança) ---
cd backend
source .venv/bin/activate
pip install -e .        # se mexeu em pyproject.toml
alembic upgrade head    # se criou migration nova
sudo systemctl restart fecot-backend
deactivate

# --- Frontend (se houve mudança) ---
cd ../frontend
npm install             # se mexeu em package.json
npm run build
sudo systemctl restart fecot-frontend
```

Se quiser automatizar isso, crie um script `deploy.sh` na raiz e adicione-o ao repo.

---

## 9) Checklist de segurança

Antes de anunciar publicamente o site:

- [ ] `JWT_SECRET` é um valor aleatório forte (64 caracteres de entropia, gerado por `secrets.token_urlsafe`)
- [ ] Senha do Postgres é forte e **não está** commitada no git
- [ ] `CORS_ORIGINS` lista apenas os domínios reais de produção (sem `*`, sem `localhost`)
- [ ] `APP_ENV=production` e `DEBUG=false` no `.env`
- [ ] SSL ativo (https sempre redireciona)
- [ ] Senhas default do seed foram trocadas
- [ ] Firewall (ufw) ativo e só com SSH + Nginx liberados
- [ ] Backups diários do Postgres funcionando
- [ ] Atualizações de sistema automáticas habilitadas (`unattended-upgrades`)

---

## Troubleshooting

**`502 Bad Gateway` no nginx**
Um dos services (backend ou frontend) não está rodando. Veja:
```bash
sudo systemctl status fecot-backend
sudo systemctl status fecot-frontend
```

**Backend sobe mas `/api/health` retorna `"database": "error"`**
Problema de conexão com o Postgres. Verifique:
- `DATABASE_URL` no `.env` está certa
- Postgres está rodando: `sudo systemctl status postgresql`
- Senha correta: `psql -U fecot -d fecot_prod -h localhost -W`

**Frontend dá erro de CORS no navegador**
`CORS_ORIGINS` no backend `.env` não inclui a URL exata do frontend. Deve ser **exatamente** `https://fecot.com.br` (com protocolo, sem barra no final).

**`npm run build` falha por falta de memória numa VPS pequena**
Crie um swap de 2GB:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Certbot falha com "DNS problem"**
Seu DNS ainda não propagou. Confirme com `dig seudominio.com +short` e tente novamente mais tarde.
