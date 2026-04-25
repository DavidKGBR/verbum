# Archive

Scripts one-shot que já cumpriram seu papel contra o banco atual.
Não rodar de novo sem revisar — re-execução pode duplicar dados ou
sobrescrever estado válido.

| Script | Origem | O que fez |
|---|---|---|
| `migrate_dictionary_multilang.py` | R8.0 | Schema migration `dictionary_entries_multilang` |
| `migrate_strongs_multilang.py` | R3.6.0 | Schema migration `strongs_lexicon_multilang` |
| `label_batch_004.py` | R7.1 | Helper de batch específico (sentiment PT) |
| `label_batch_es.py` | R7.1 | Helper de batch ES (sentiment) |
| `fix_truncated_entries.py` | R8.2 | Re-parse de XMLs ThML truncados (688 entries estendidas) |
| `fix_mojibake_stubborn.py` | R8.4 | Correção de mojibake em stubs de dicionário |
| `fix_sin_topic_translations.py` | R9 | Fix pontual de tradução de tópicos |
| `prep_retranslation_batch.py` | R8.2 | Gerou os turnos do `tmp_turns/` (workspace já descartado) |

Scripts vivos / re-utilizáveis ficam em `scripts/` (não nesse arquivo).
