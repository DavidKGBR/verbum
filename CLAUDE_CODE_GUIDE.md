# 🤖 CLAUDE CODE — Guia de Implementação
## Bible Data Pipeline v2.0

> **Leia este arquivo primeiro.** Depois leia o ROADMAP_V2.md para detalhes.

---

## 📂 Contexto do Projeto

Já existe uma **v1.0 funcional** no diretório `bible-data-pipeline/`:
- Pipeline ETL: Extract (bible-api.com) → Transform (NLP) → Load (DuckDB)
- 41 testes passando com pytest
- Dashboard Streamlit (5 páginas)
- Docker + CI/CD + Makefile
- Schemas Pydantic para todos os modelos

**Teu trabalho:** Expandir para v2.0 seguindo os 7 sprints do ROADMAP_V2.md.

---

## ⚡ Ordem de execução recomendada

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4 → Sprint 5 → Sprint 6 → Sprint 7
Multi-lang   Cross-ref   FastAPI    Gemini     Frontend    Reader3D    GCP
  (base)      (data)     (serve)    (enrich)   (viz)       (wow)      (deploy)
```

**Cada sprint depende das anteriores.** Não pule.

---

## 🔑 Regras inegociáveis

1. **Testes primeiro** — Cada módulo novo precisa de testes. Rodar `pytest` antes de commitar.
2. **Pydantic em tudo** — Todo dado que entra ou sai passa por um modelo Pydantic.
3. **Cache sempre** — API externa? Cache em disco (JSON). Gemini? Cache por verse_id.
4. **Rate limiting** — Nunca fazer requests sem delay/backoff.
5. **Docstrings** — Google style, em inglês, em toda função pública.
6. **Tipo anotado** — Type hints em tudo. mypy deve passar.
7. **Sem secrets no código** — .env + python-dotenv. Nunca hardcode API keys.
8. **Logs, não prints** — Usar `logging` + `rich` para output bonito.

---

## 🏁 Sprint 1: Multi-idioma (COMEÇAR AQUI)

### O que criar:

```
src/extract/translations.py    — Registry de traduções disponíveis
src/extract/bible_sources.py   — Fetcher multi-source (interface comum)
src/transform/multilang_aligner.py — Alinhar versos entre traduções
```

### Passo a passo:

1. **Criar `translations.py`** com registro de APIs:
   ```python
   TRANSLATIONS = {
       "KJV": {"api": "bible-api.com", "lang": "en", "path": "/{ref}?translation=kjv"},
       "ASV": {"api": "bible-api.com", "lang": "en", "path": "/{ref}?translation=asv"},
       "NVI": {"api": "abibliadigital.com.br", "lang": "pt-br", "path": "/verses/nvi/{book}/{chapter}"},
       # etc...
   }
   ```

2. **Criar `bible_sources.py`** com interface comum:
   ```python
   class BibleSource(ABC):
       @abstractmethod
       def fetch_chapter(self, book: str, chapter: int) -> list[RawVerse]: ...

   class BibleApiSource(BibleSource):  # bible-api.com
   class ABibliaDigitalSource(BibleSource):  # PT-BR
   ```

3. **Expandir schema** — Adicionar `translation_id` e `language` ao `RawVerse` e `EnrichedVerse`

4. **Expandir DuckDB** — Tabela `translations` + coluna `translation_id` na `verses`

5. **Expandir CLI** — `--translations KJV,NVI`

6. **Testes** — `test_multilang.py` com mocks das APIs

### Verificação:
```bash
python -m src.cli run --translations KJV,NVI --books GEN,PSA,JHN
python -m src.cli query "SELECT translation_id, COUNT(*) FROM verses GROUP BY 1"
pytest tests/test_multilang.py -v
```

---

## 🏁 Sprint 2: Cross-References

### Fonte de dados:
- **OpenBible.info** — CSV com ~340k pares: https://www.openbible.info/labs/cross-references/
- Download direto: `cross_references.txt` (TSV: from_verse → to_verse)

### O que criar:
```
src/extract/crossref_extractor.py  — Download e parse do CSV
src/transform/crossref_mapper.py   — Normalizar IDs, calcular distância
```

### Schema DuckDB:
```sql
CREATE TABLE cross_references (
    source_verse_id VARCHAR,
    target_verse_id VARCHAR,
    source_book_position INTEGER,
    target_book_position INTEGER,
    votes INTEGER,  -- OpenBible confidence votes
    PRIMARY KEY (source_verse_id, target_verse_id)
);
```

---

## 🏁 Sprint 3: FastAPI

### O que criar:
```
src/api/main.py          — App FastAPI
src/api/routers/         — Routers por domínio
src/api/dependencies.py  — DB pool, Gemini client
```

### Endpoints mínimos para o frontend funcionar:
```
GET  /api/v1/books                              → lista de 66 livros
GET  /api/v1/books/{id}/chapters/{ch}           → versos de um capítulo
GET  /api/v1/reader/page?book=GEN&ch=1&tr=KJV   → página do reader
GET  /api/v1/reader/parallel?book=GEN&ch=1&l=KJV&r=NVI
GET  /api/v1/crossrefs/arcs                     → dados pro arc diagram
GET  /api/v1/analytics/sentiment?group_by=book  → dados pro dashboard
POST /api/v1/ai/explain                         → explicação Gemini
```

---

## 🏁 Sprint 4: Gemini

### Padrão do client:
```python
class GeminiClient:
    def __init__(self, api_key, cache_dir):
        self.model = "gemini-2.0-flash"
        self.cache = {}  # JSON em disco

    async def explain(self, verse_id, lang) -> dict:
        cache_key = f"{verse_id}_{lang}"
        if cached := self._load_cache(cache_key):
            return cached
        response = await self._call_api(prompt)
        self._save_cache(cache_key, response)
        return response
```

### Prioridade: cache > API call. Free tier = ~15 RPM.

---

## 🏁 Sprint 5: Frontend + Arc Diagram

### Setup:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install d3 recharts @tanstack/react-query axios
```

### Arc Diagram — a lógica core:
```typescript
// Cada arco é um path SVG semicircular
// x1, x2 = posição normalizada (0-1) × largura do canvas
// raio = |x2-x1| / 2
const arcPath = (x1, x2) => {
  const r = Math.abs(x2 - x1) / 2;
  const cx = (x1 + x2) / 2;
  return `M ${x1},${baseline} A ${r},${r} 0 0,1 ${x2},${baseline}`;
};
// >10k arcos → Canvas. <10k → SVG. Hover → SVG overlay.
```

---

## 🏁 Sprint 6: Bible Reader 3D

### PROTÓTIPO JÁ EXISTE: `BibleReader.jsx`

Usar como base. Expandir com:
- Dados reais da API (substituir BIBLE_DATA estático)
- Seletor de tradução
- Modo paralelo
- Painel AI
- Cross-refs clicáveis

### Fase A (Core) → B (Multi-lang) → C (AI) → D (Polish)

Ver ROADMAP_V2.md seção 7.8 para checklist detalhado por fase.

---

## 🏁 Sprint 7: GCP Deploy

### Terraform:
```
infra/terraform/
├── main.tf          — provider, backend
├── bigquery.tf      — dataset + tables
├── cloud_run.tf     — API + frontend
├── gcs.tf           — data lake bucket
├── scheduler.tf     — cron ETL semanal
└── variables.tf     — project_id, region, etc
```

---

## 📋 Checklist final antes de publicar no GitHub

```markdown
- [ ] Todos os testes passando (`pytest -v`)
- [ ] Lint limpo (`ruff check src/ tests/`)
- [ ] Types OK (`mypy src/`)
- [ ] Docker build funcional (`docker compose build`)
- [ ] README.md atualizado com screenshots
- [ ] .env.example com todas as variáveis
- [ ] LICENSE (MIT)
- [ ] CONTRIBUTING.md
- [ ] GitHub Actions CI passando
- [ ] Dados de exemplo no repo (sample com 3-4 livros)
- [ ] Demo GIF/video no README
```

---

*Boa sorte, Claude Code. Vai ficar incrível.* 🕊️
