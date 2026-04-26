# Suíte de testes do FECOT Backend

Cobertura completa do backend com **105 testes** passando — todas as regras de
negócio críticas validadas: autenticação, autorização por role, CRUD, fluxo de
aprovação de graduação, e upload de avatar.

## Como rodar

### Pré-requisitos

- Postgres rodando localmente em `localhost:5432`
- Usuário `fecot` com senha `fecot` e permissão de criar bancos
- Python 3.11+ com dependências de dev instaladas

### Setup do banco (uma vez só)

```bash
sudo -u postgres psql
```

No prompt do psql:
```sql
CREATE USER fecot WITH PASSWORD 'fecot' CREATEDB;
\q
```

### Instalar dependências de teste

```bash
cd backend
pip install -e ".[dev]"
```

### Rodar tudo

```bash
pytest
```

Saída esperada:
```
=============================== 105 passed in ~75s ===============================
```

### Rodar com cobertura

```bash
pytest --cov=app --cov-report=html
```

Abre `htmlcov/index.html` no navegador pra ver mapa visual.

### Rodar só uma categoria

```bash
pytest -m unit              # só unitários (rápidos, não precisa de banco)
pytest -m integration       # só integração
pytest tests/unit/          # por pasta
pytest tests/integration/test_avatar.py    # arquivo específico
pytest -k "test_login"      # por padrão de nome
```

### Verbose / debug

```bash
pytest -v                   # mostra cada teste
pytest -vv                  # mostra detalhes de assertion failures
pytest -x                   # para no primeiro erro
pytest --pdb                # cai num debugger no primeiro erro
```

## Estrutura

```
tests/
├── conftest.py             # Fixtures globais: banco efêmero, client HTTP
├── factories.py            # make_admin, make_athlete, make_test_image, etc
├── unit/                   # Testes puros (sem banco)
│   ├── test_graduations.py
│   ├── test_security.py
│   └── test_avatar_storage.py
└── integration/            # Testes com banco real
    ├── test_smoke.py
    ├── test_auth.py
    ├── test_self_edit.py
    ├── test_athletes_list.py
    ├── test_athletes_crud.py
    ├── test_graduation_requests.py
    ├── test_academies.py
    └── test_avatar.py
```

## Como funciona o isolamento

Cada execução de `pytest`:

1. **Cria um banco temporário** com nome único (`fecot_test_{uuid}`)
2. **Cria todas as tabelas** via `Base.metadata.create_all()`
3. Antes de cada teste, **TRUNCATE** todas as tabelas (zera tudo)
4. No fim de tudo, **DROP DATABASE**

Isso garante que:
- Testes podem rodar em qualquer ordem
- Não há "vazamento" de dados entre testes
- Não atrapalha o banco de desenvolvimento (`fecot_dev`)
- CI/CD pode rodar paralelamente sem conflito

## Bugs encontrados e corrigidos

A própria escrita dos testes serviu pra encontrar 2 bugs no código de produção,
ambos já corrigidos:

1. **Autorização frouxa em `/api/academies`** — qualquer manager conseguia
   editar/gerenciar academias de outros managers. Corrigido com helper
   `_check_can_manage_academy()` aplicado em PATCH/PUT, add_teacher e remove_teacher.

2. **Comentário desalinhado em `app/api/athletes.py`** — texto dizia que admin
   podia alterar graduação direto, mas o schema `AthleteUpdate` nem tem o campo.
   Comentário corrigido pra refletir a regra real (toda mudança passa pelo fluxo
   de `GraduationRequest`, sem exceção, garantindo rastreabilidade).

Esse é o valor real de uma suíte de testes: ela vira lupa pra detectar
inconsistências que passariam despercebidas em revisões de código.

## Dicas práticas

### Adicionar um teste novo

1. Vai no arquivo apropriado em `tests/integration/`
2. Use as factories de `tests/factories.py` (não cria entities manualmente)
3. Use `login_as(client, email)` pra obter o header de Authorization

Exemplo:
```python
def test_meu_caso(self, client, db_session: Session):
    teacher = make_teacher(db_session)
    aluno = make_athlete(db_session, professor=teacher)
    headers = login_as(client, teacher.email)

    resp = client.get(f"/api/athletes/{aluno.id}", headers=headers)
    assert resp.status_code == 200
```

### Banco de teste poluído

Se algo der errado e ficar um banco `fecot_test_*` órfão, lista e remove:

```bash
sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname LIKE 'fecot_test_%'"
sudo -u postgres psql -c "DROP DATABASE fecot_test_xxxxxxx"
```

### Performance

A suíte completa roda em ~75s na minha máquina. Se ficar lenta:

- Use `-x` pra parar no primeiro erro durante desenvolvimento
- `pytest-xdist` roda em paralelo: `pip install pytest-xdist && pytest -n auto`
- Marque testes lentos com `@pytest.mark.slow` e exclua: `pytest -m "not slow"`
