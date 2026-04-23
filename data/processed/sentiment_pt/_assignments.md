# R7.1 — Sentiment Labeling Assignments (PT-BR)

**Workflow:** antes de começar, um agente edita a linha do batch pro status `🔄 labeling` (reserva). Ao terminar, muda pra `✅ done` e anexa o arquivo output. Maestro resolve conflitos manualmente se dois agentes pegarem o mesmo.

**Status legend:** `⏳ free` (livre) · `🔄 labeling` (reservado) · `✅ done` (pronto, aguarda load) · `📦 loaded` (já no DuckDB)

---

## Fase F1 — Salmos + Lamentações + Cânticos (prioridade máxima)

Total: 2.732 versos · ~11 batches.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| PSA/batch_001_input.tsv         |    46  |   A0  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_002_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_003_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_004_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_005_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_006_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_007_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_008_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_009_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| PSA/batch_010_input.tsv         |    61  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| LAM/batch_001_input.tsv         |   154  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| SNG/batch_001_input.tsv         |   117  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Fase F2 — Evangelhos (narrativa emocional)

Total: 3.773 versos · 14 batches · gerada 2026-04-23.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| MAT/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| MAT/batch_002_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| MAT/batch_003_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| MAT/batch_004_input.tsv         |   168  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| MRK/batch_001_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| MRK/batch_002_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| MRK/batch_003_input.tsv         |    75  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| LUK/batch_001_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| LUK/batch_002_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| LUK/batch_003_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| LUK/batch_004_input.tsv         |   251  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JHN/batch_001_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JHN/batch_002_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JHN/batch_003_input.tsv         |   279  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Fase F3 — Narrativa AT (Gênesis + Êxodo + Jó)

Total: 3.816 versos · 15 batches · gerada 2026-04-23.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| GEN/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GEN/batch_002_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GEN/batch_003_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GEN/batch_004_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GEN/batch_005_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GEN/batch_006_input.tsv         |    33  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| EXO/batch_001_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| EXO/batch_002_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| EXO/batch_003_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| EXO/batch_004_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| EXO/batch_005_input.tsv         |    13  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JOB/batch_001_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JOB/batch_002_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JOB/batch_003_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JOB/batch_004_input.tsv         |   170  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Próximas fases (ainda não preparadas)

- **F4** — Sapienciais: `PRO` (~3), `ECC` (~1)
- **F5** — Epístolas + Apocalipse: `ROM`…`REV`
- **F6** — Profetas: `ISA`, `JER`, `EZK`, `DAN`, menores
- **F7** — Histórico + legal: `LEV`…`EST`

---

## Pendentes pro maestro (loads + commits)

| Batch                     | Loaded ao DuckDB | Commit SHA |
|---------------------------|------------------|------------|
| (aguardando F1 terminar)  | —                | —          |
