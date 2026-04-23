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

## Próximas fases (ainda não preparadas)

Gerar com `prep_sentiment_batch.py` quando F1 estiver a ≥60% de conclusão:

- **F2** — Evangelhos: `MAT` (~13 batches), `MRK` (~3), `LUK` (~4), `JHN` (~3)
- **F3** — Narrativa AT: `GEN` (~5), `EXO` (~4), `JOB` (~4)
- **F4** — Sapienciais: `PRO` (~3), `ECC` (~1)
- **F5** — Epístolas + Apocalipse: `ROM`…`REV`
- **F6** — Profetas: `ISA`, `JER`, `EZK`, `DAN`, menores
- **F7** — Histórico + legal: `LEV`…`EST`

---

## Pendentes pro maestro (loads + commits)

| Batch                     | Loaded ao DuckDB | Commit SHA |
|---------------------------|------------------|------------|
| (aguardando F1 terminar)  | —                | —          |
