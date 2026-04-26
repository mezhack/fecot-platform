# FECOT Platform

Plataforma de gerenciamento de atletas e academias da **Federação Centro-Oeste de Taekwondo**, ligada à Liga Nacional de Taekwondo.

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind + shadcn/ui
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL + JWT

---

## Modelo de domínio

### Entidades

**Athlete** — atleta da FECOT.
Campos: `name`, `cpf`, `email`, `phone`, `birth_date` (idade calculada dinamicamente), `weight_kg`, `sex` (`male`/`female`), `graduation`, `role`, `home_academy_id`, `professor_id`, `active`.

**Academy** — academia/escola de taekwondo filiada.
Campos: `name`, `cnpj`, `address`, `city`, `state`, `zip_code`, `latitude`, `longitude` (para mapa interativo), `phone`, `email`, `manager_id`, `active`.

**GraduationRequest** — solicitação de mudança de graduação (fluxo de aprovação).
Campos: `athlete_id`, `from_graduation`, `to_graduation`, `requested_by_id`, `reviewed_by_id`, `status` (`pending`/`approved`/`rejected`), `reason`, `review_notes`, `created_at`, `reviewed_at`.

**academy_teachers** — tabela de associação N:N que permite um professor ensinar em múltiplas academias.

### Papéis (roles)

| Role | Descrição |
|---|---|
| `athlete` | Aluno comum da FECOT |
| `teacher` | Professor — pode ensinar em academias. **Requer ≥ 1º Dan** |
| `academy_manager` | Gestor/responsável por uma ou mais academias. **Requer ≥ 1º Dan** |
| `admin` | Administrador geral da federação — permissão total |

### Graduações

Do iniciante ao mestre: `10º Gub`, `9º Gub`, ..., `1º Gub`, `1º Dan`, `2º Dan`, ..., `10º Dan` (20 níveis).

### Regras de negócio implementadas

- Atletas com role `teacher` ou `academy_manager` precisam ter graduação ≥ 1º Dan
- O manager de uma academia precisa ter role `academy_manager` ou `admin` e graduação ≥ 1º Dan
- Um professor pode ser teacher em várias academias (relação N:N)
- Um atleta estuda em uma academia (`home_academy_id`) e tem um professor individual (`professor_id`)
- A graduação de um atleta **não pode ser editada diretamente** — passa pelo fluxo de GraduationRequest (exceto por admin)
- Apenas o professor individual, o manager da academia, ou admin podem solicitar mudança de graduação de um atleta
- Apenas admin pode aprovar ou rejeitar solicitações de graduação
- Apenas admin pode criar ou remover academias
- Apenas admin pode remover atletas (preserva histórico da federação)
- Email e CPF são únicos quando preenchidos
- Não é possível remover atleta que é professor de outros ou manager de academia
- Não é possível remover academia com alunos vinculados

---

## Estrutura do repositório

```
fecot-platform/
├── backend/
│   ├── app/
│   │   ├── api/              # Rotas: health, auth, athletes, academies, graduation_requests
│   │   ├── core/             # Config, security (JWT/bcrypt), graduations
│   │   ├── db/               # Engine e session do SQLAlchemy
│   │   ├── models/           # SQLAlchemy: Athlete, Academy, GraduationRequest, academy_teachers
│   │   ├── schemas/          # Pydantic (validação I/O)
│   │   └── main.py
│   ├── alembic/versions/     # Migrations
│   ├── scripts/seed.py
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── atletas/
│   │   │   ├── academias/
│   │   │   └── graduacoes/   # NOVO: fluxo de aprovação
│   ├── components/
│   ├── hooks/use-auth.ts
│   └── lib/api.ts            # Cliente HTTP tipado
└── docker-compose.yml
```

---

## Rodando localmente

### Opção A — Docker Compose (recomendado)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

docker compose up --build

# Na primeira vez, rodar o seed em outro terminal:
docker compose exec backend python -m scripts.seed
```

- Frontend: http://localhost:3000
- API: http://localhost:3002
- Docs (Swagger): http://localhost:3002/docs

### Opção B — Sem Docker

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env
# Ajuste DATABASE_URL no .env se necessário

createdb fecot_dev
alembic upgrade head
python -m scripts.seed

uvicorn app.main:app --reload --port 3002
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Credenciais de teste (criadas pelo seed)

| Papel | Email | Senha |
|---|---|---|
| Admin | admin@fecot.com.br | 00000000000 |
| Academy Manager | carlos@tigretaekwondo.com.br | 11111111111 |
| Academy Manager | ana@dragaotaekwondo.com.br | 22222222222 |
| Teacher | pedro@tigretaekwondo.com.br | 66666666666 |
| Atleta | joao@example.com | 33333333333 |

> ⚠️ Por padrão, se um atleta é criado com CPF mas sem senha, o **CPF vira a senha inicial**. Ele deve trocar depois via `/api/update_password`. Em produção, **troque todas as senhas do seed logo após o deploy**.

---

## Endpoints da API

### Autenticação
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/login` | ❌ | Login por email ou CPF |
| GET | `/api/me` | ✅ | Atleta autenticado |
| PATCH | `/api/me` | ✅ | **Auto-edição de dados pessoais** (qualquer role) |
| PATCH | `/api/update_password` | ✅ | Trocar senha |

### Atletas
| Método | Rota | Quem pode | Descrição |
|---|---|---|---|
| GET | `/api/athletes` | teacher+ | Lista com filtros (atleta comum recebe 403) |
| POST | `/api/athletes` | teacher+ | Cria |
| GET | `/api/athletes/{id}` | autenticado (próprio) ou teacher+ | Detalhe |
| PATCH | `/api/athletes/{id}` | admin, manager da academia, professor individual | Atualiza dados administrativos |
| DELETE | `/api/athletes/{id}` | admin | Remove |

### Academias
| Método | Rota | Quem pode | Descrição |
|---|---|---|---|
| GET | `/api/academies` | autenticado | Lista |
| GET | `/api/academies/public/map` | ❌ | Mapa público (para landing page) |
| POST | `/api/academies` | admin | Cria |
| GET | `/api/academies/{id}` | autenticado | Detalhe |
| PATCH | `/api/academies/{id}` | manager/admin | Atualiza |
| DELETE | `/api/academies/{id}` | admin | Remove |
| POST | `/api/academies/{id}/teachers` | manager/admin | Associa professor |
| DELETE | `/api/academies/{id}/teachers/{athlete_id}` | manager/admin | Remove professor |

### Solicitações de Graduação
| Método | Rota | Quem pode | Descrição |
|---|---|---|---|
| GET | `/api/graduation_requests` | autenticado (filtrado por permissão) | Lista |
| POST | `/api/graduation_requests` | professor do atleta, manager da academia, admin | Cria solicitação |
| GET | `/api/graduation_requests/{id}` | autenticado | Detalhe |
| POST | `/api/graduation_requests/{id}/approve` | admin | Aprova (aplica a graduação) |
| POST | `/api/graduation_requests/{id}/reject` | admin | Rejeita |

Docs interativas completas em `/docs` (Swagger) ou `/redoc`.

---

## Fluxo de mudança de graduação (passo-a-passo)

1. **Professor/Manager identifica** que um aluno está pronto pra nova graduação
2. No painel, vai em **Graduações → Nova solicitação**, escolhe o aluno e a graduação pretendida
3. Status da solicitação: `pending` (aguardando admin)
4. **Admin** entra em **Graduações**, vê a lista de pendentes
5. Aprova → graduação do atleta é atualizada automaticamente, request vira `approved`
6. Ou rejeita → graduação não muda, request vira `rejected` (com `review_notes` opcional)

Apenas **uma solicitação pendente por atleta por vez** (retorna 409 se tentar criar duplicada).

## Navegação por papel (role)

A experiência do usuário é **diferente conforme o role**:

### `athlete` (aluno comum)
- Login → redireciona direto para `/perfil`
- Vê apenas: **Meu Perfil** (editar dados pessoais, trocar senha)
- **NÃO tem acesso** a `/dashboard/*`, listagem de atletas, academias, graduações
- Edita apenas campos pessoais próprios via `PATCH /api/me` — não pode alterar graduação, papel, academia ou professor
- CPF é imutável após cadastro

### `teacher` (professor, ≥ 1º Dan)
- Login → vai para `/dashboard`
- Acessa: Dashboard, Atletas, Academias, Graduações (suas solicitações), Meu Perfil
- Pode criar atletas, editar seus alunos, solicitar mudanças de graduação dos seus alunos

### `academy_manager` (gestor de academia, ≥ 1º Dan)
- Mesmo que `teacher` + pode editar a(s) academia(s) que gerencia
- Pode solicitar mudança de graduação dos alunos da(s) academia(s) que gerencia
- Pode associar/desassociar professores a academias

### `admin` (administrador da federação)
- Tudo acima + criar/editar/deletar academias
- **Aprovar ou rejeitar solicitações de graduação** (único papel que pode)
- Remover atletas
- Alterar `role` e `graduation` diretamente (sem passar pelo fluxo)

## Modelo mental: `/perfil` vs `/dashboard/atletas/[id]/editar`

Duas URLs com propósitos distintos:
- **`/perfil`** — eu mesmo editando MEUS dados. URL sem ID, sempre aponta pro usuário logado (`/api/me`).
- **`/dashboard/atletas/[id]/editar`** — gestão administrativa de OUTRO atleta. Só teacher+ pode acessar; o backend retorna 403 para o resto.

---

## Testes

O backend tem uma suíte com **105 testes** cobrindo todas as regras de negócio críticas:
autenticação, autorização por role, CRUD, fluxo de aprovação de graduação, e upload de avatar.

```bash
cd backend
pip install -e ".[dev]"
pytest
```

Documentação completa em [`backend/tests/README.md`](./backend/tests/README.md).

---

## Deploy em produção

Veja [`DEPLOY.md`](./DEPLOY.md) para o guia completo de deploy na Hostinger VPS.

---

## Troubleshooting

**"Failed to fetch Inter/Bebas Neue from Google Fonts" durante `npm run build`**
Ambiente sem acesso ao Google Fonts. Soluções: rodar build em máquina com internet aberta, ou usar `next/font/local`.

**CORS error**
`CORS_ORIGINS` no `backend/.env` precisa incluir exatamente a URL do frontend (com protocolo, sem barra final).

**"Erro ao conectar com o servidor" no login**
Verifique `NEXT_PUBLIC_API_URL` no `frontend/.env.local` e confirme que a API responde: `curl $URL/api/health`.


Veja [`DEPLOY.md`](./DEPLOY.md) para o guia completo de deploy na Hostinger VPS.

---

## Troubleshooting

**"Failed to fetch Inter/Bebas Neue from Google Fonts" durante `npm run build`**
Ambiente sem acesso ao Google Fonts. Soluções: rodar build em máquina com internet aberta, ou usar `next/font/local`.

**CORS error**
`CORS_ORIGINS` no `backend/.env` precisa incluir exatamente a URL do frontend (com protocolo, sem barra final).

**"Erro ao conectar com o servidor" no login**
Verifique `NEXT_PUBLIC_API_URL` no `frontend/.env.local` e confirme que a API responde: `curl $URL/api/health`.
