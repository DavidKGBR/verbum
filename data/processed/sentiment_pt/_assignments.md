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

## Fase F4 — Sapienciais (Provérbios + Eclesiastes)

Total: 1.137 versos · 5 batches · gerada 2026-04-23.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| PRO/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PRO/batch_002_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| PRO/batch_003_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| PRO/batch_004_input.tsv         |    15  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| ECC/batch_001_input.tsv         |   222  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Fase F5 — Epístolas + Apocalipse

Total: 3.173 versos · 26 batches · gerada 2026-04-23.

**Distribuição:** A2 = Paulinas maiores (ROM/1CO/2CO/GAL) · A3 = Paulinas menores + HEB · A4 = Cartas gerais + Apocalipse.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| ROM/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| ROM/batch_002_input.tsv         |   133  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1CO/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1CO/batch_002_input.tsv         |   137  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| 2CO/batch_001_input.tsv         |   257  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| GAL/batch_001_input.tsv         |   149  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| EPH/batch_001_input.tsv         |   155  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| PHP/batch_001_input.tsv         |   104  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| COL/batch_001_input.tsv         |    95  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1TH/batch_001_input.tsv         |    89  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| 2TH/batch_001_input.tsv         |    47  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1TI/batch_001_input.tsv         |   113  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| 2TI/batch_001_input.tsv         |    83  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| TIT/batch_001_input.tsv         |    46  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| PHM/batch_001_input.tsv         |    25  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| HEB/batch_001_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| HEB/batch_002_input.tsv         |     3  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JAS/batch_001_input.tsv         |   108  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1PE/batch_001_input.tsv         |   105  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| 2PE/batch_001_input.tsv         |    61  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| 1JN/batch_001_input.tsv         |   105  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| 2JN/batch_001_input.tsv         |    13  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| 3JN/batch_001_input.tsv         |    15  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JUD/batch_001_input.tsv         |    25  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| REV/batch_001_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| REV/batch_002_input.tsv         |   105  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Fase F6 — Profetas (maior fase)

Total: 5.336 versos · 30 batches · gerada 2026-04-23.

**Distribuição:** A2 = Isaías + menores antigos · A3 = Jeremias + Daniel · A4 = Ezequiel + menores tardios + Jonas.

| Batch                           | Verses | Agent | Status | Started | Finished |
|---------------------------------|-------:|-------|--------|---------|----------|
| ISA/batch_001_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| ISA/batch_002_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| ISA/batch_003_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| ISA/batch_004_input.tsv         |   300  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| ISA/batch_005_input.tsv         |    92  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| HOS/batch_001_input.tsv         |   197  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| JOL/batch_001_input.tsv         |    73  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| AMO/batch_001_input.tsv         |   146  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| OBA/batch_001_input.tsv         |    21  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| MIC/batch_001_input.tsv         |   105  |   A2  | ✅ done | 2026-04-23 | 2026-04-23 |
| JER/batch_001_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JER/batch_002_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JER/batch_003_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JER/batch_004_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| JER/batch_005_input.tsv         |   164  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| DAN/batch_001_input.tsv         |   300  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| DAN/batch_002_input.tsv         |    57  |   A3  | ✅ done | 2026-04-23 | 2026-04-23 |
| EZK/batch_001_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| EZK/batch_002_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| EZK/batch_003_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| EZK/batch_004_input.tsv         |   300  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| EZK/batch_005_input.tsv         |    73  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| JON/batch_001_input.tsv         |    48  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| NAM/batch_001_input.tsv         |    47  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| HAB/batch_001_input.tsv         |    56  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| ZEP/batch_001_input.tsv         |    53  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| HAG/batch_001_input.tsv         |    38  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| ZEC/batch_001_input.tsv         |   211  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |
| MAL/batch_001_input.tsv         |    55  |   A4  | ✅ done | 2026-04-23 | 2026-04-23 |

---

## Próximas fases (ainda não preparadas)

- **F7** — Histórico + legal: `LEV`…`EST`

---

## Pendentes pro maestro (loads + commits)

| Batch                     | Loaded ao DuckDB | Commit SHA |
|---------------------------|------------------|------------|
| (aguardando F1 terminar)  | —                | —          |
