"""
translate_dictionary_gemini.py — Gemini Flash 2.0 bulk translator

Reads a TSV produced by `prep_dictionary_batch.py` and, for each row,
asks Gemini to translate text_easton + text_smith into the target
language (pt | es). Output is JSONL ready for
`load_dictionary_batch.py`.

The prompt bakes in the translation conventions established while
doing this manually with Claude Opus in Sprint 1:

  - Bible references in local format (Gen. 6:20 → Gn. 6:20 for PT,
    Gén. 6:20 for ES)
  - Canonical biblical proper names per locale (Moisés, Arão/Aarón,
    Davi/David, Eliseu/Eliseo, Abraão/Abraham…)
  - "B.C." → "a.C.", "See X" → "Veja X"/"Véase X"
  - Preserve curly/smart quotes and inline parenthetical glosses
  - Tone: modern, natural, no Vitorian archaism

Usage:
    python scripts/translate_dictionary_gemini.py \\
        --input /tmp/dict_sprint1_batch.tsv \\
        --lang pt \\
        --out /tmp/dict_sprint1_gemini_pt.jsonl

Requires GEMINI_API_KEY in env or .env.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load .env so GEMINI_API_KEY is available when running the script directly.
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

from src.ai.gemini_client import GeminiClient  # noqa: E402

CACHE_DIR = PROJECT_ROOT / "data" / "cache" / "gemini_dict_translate"


PROMPT_TEMPLATE_PT = """Você é um tradutor especialista em literatura bíblica clássica. Sua tarefa é traduzir verbetes do Dicionário Bíblico de Easton (1897) e Smith (1863) do inglês para **português brasileiro**.

**Regras ABSOLUTAS de fidelidade:**

1. **Referências bíblicas** seguem o formato abreviado brasileiro consagrado:
   Gen.→Gn.  Ex.→Êx.  Lev.→Lv.  Num.→Nm.  Deut.→Dt.  Josh.→Js.  Judg.→Jz.
   Ruth→Rt.  1 Sam.→1 Sm.  2 Sam.→2 Sm.  1 Kings→1 Rs.  2 Kings→2 Rs.
   1 Chr.→1 Cr.  2 Chr.→2 Cr.  Ezra→Ed.  Neh.→Ne.  Esth.→Et.  Job→Jó
   Ps.→Sl.  Prov.→Pv.  Eccl.→Ec.  Song→Ct.  Isa.→Is.  Jer.→Jr.  Lam.→Lm.
   Ezek.→Ez.  Dan.→Dn.  Hos.→Os.  Joel→Jl.  Amos→Am.  Obad.→Ob.  Jonah→Jn.
   Mic.→Mq.  Nah.→Na.  Hab.→Hc.  Zeph.→Sf.  Hag.→Ag.  Zech.→Zc.  Mal.→Ml.
   Matt.→Mt.  Mark→Mc.  Luke→Lc.  John→Jo.  Acts→At.  Rom.→Rm.
   1 Cor.→1 Co.  2 Cor.→2 Co.  Gal.→Gl.  Eph.→Ef.  Phil.→Fp.  Col.→Cl.
   1 Thess.→1 Ts.  2 Thess.→2 Ts.  1 Tim.→1 Tm.  2 Tim.→2 Tm.  Titus→Tt.
   Philem.→Fm.  Heb.→Hb.  James→Tg.  1 Pet.→1 Pe.  2 Pet.→2 Pe.
   1 John→1 Jo.  2 John→2 Jo.  3 John→3 Jo.  Jude→Jd.  Rev.→Ap.

2. **Nomes próprios bíblicos** em português consagrado (NVI/ARA):
   Moses→Moisés  Aaron→Arão  Miriam→Miriã  Abraham→Abraão  Isaac→Isaque
   Jacob→Jacó  Joseph→José  David→Davi  Solomon→Salomão  Elijah→Elias
   Elisha→Eliseu  Isaiah→Isaías  Jeremiah→Jeremias  Ezekiel→Ezequiel
   Daniel→Daniel  Peter→Pedro  Paul→Paulo  John→João  Matthew→Mateus
   Mark→Marcos  Luke→Lucas  Mary→Maria  Joshua→Josué  Noah→Noé
   Adam→Adão  Eve→Eva  Cain→Caim  Abel→Abel  Seth→Sete
   Jehovah→Jeová  Christ→Cristo  Lord→Senhor  God→Deus
   Pharaoh→Faraó  Zipporah→Zípora  Jochebed→Joquebede  Amram→Anrão
   Nadab→Nadabe  Abihu→Abiú  Eleazar→Eleazar  Ithamar→Itamar
   Elisheba→Eliseba  Amminadab→Aminadabe  Hur→Hur  Korah→Corá
   Dathan→Datã  Abiram→Abirão  Azariah→Azarias  Shadrach→Sadraque
   Meshach→Mesaque  Jehoiada→Joiada  Benaiah→Benaia  Zadok→Zadoque
   Eli→Eli  Abiathar→Abiatar  Sennacherib→Senaqueribe  Ahasuerus→Assuero
   Jephthah→Jefté  Josiah→Josias  Huldah→Hulda  Achbor→Acbor
   Hezekiah→Ezequias  Ammonites→amonitas  Gadite→gadita  Levite→levita
   Benjamin→Benjamim  Naphtali→Naftali  Asher→Aser  Judah→Judá
   Manasseh→Manassés  Ephraim→Efraim  Reuben→Rúben  Simeon→Simeão
   Gershon→Gérson  Merari→Merari  Kohath→Coate

3. **Lugares** em português consagrado:
   Egypt→Egito  Babylon→Babilônia  Damascus→Damasco  Jerusalem→Jerusalém
   Samaria→Samaria  Syria→Síria  Arabia→Arábia  Assyria→Assíria
   Persia→Pérsia  Greece→Grécia  Rome→Roma  Lebanon→Líbano
   Mesopotamia→Mesopotâmia  Armenia→Armênia  Sinai→Sinai  Horeb→Horebe
   Jordan→Jordão  Dead Sea→mar Morto  Red Sea→mar Vermelho
   Canaan→Canaã  Philistia→Filístia  Moab→Moabe  Edom→Edom
   Ararat→Ararate  Paran→Parã  Hazeroth→Hazerote  Meribah→Meribá
   Kadesh→Cades  Bethel→Betel  Bethlehem→Belém  Hebron→Hebrom
   Jericho→Jericó  Nazareth→Nazaré  Galilee→Galileia  Judea→Judeia
   Ephesus→Éfeso  Corinth→Corinto  Antioch→Antioquia

4. **Termos eclesiásticos/teológicos**:
   covenant→aliança  tabernacle→tabernáculo  priest→sacerdote
   high priest→sumo sacerdote  altar→altar  temple→templo
   ark→arca  deluge→dilúvio  prophet→profeta  prophetess→profetisa
   tribe→tribo  Levitical→levítica  Promised Land→Terra Prometida
   Mount Sinai→monte Sinai  Exodus (the event)→Êxodo
   Ten Commandments→Dez Mandamentos  Passover→Páscoa  Sabbath→sábado
   eunuch→eunuco  gentile→gentio  Greek→grego  Hebrew→hebraico

5. **Outros**:
   B.C.→a.C.  A.D.→d.C.  Comp.→Comp.  marg.→marg.  See X→Veja X
   R.V.→R.V.  A.V.→A.V.  LXX→LXX  Targum→Targum
   miles→milhas  feet→pés  acres→acres (manter unidades originais)
   Mohammedan→maometano  Koran→Corão  rabbins/rabbis→rabinos

6. **Preservação**: mantenha TODAS as referências entre parênteses (Gn. 8:4),
   aspas “curvas” originais, itálicos onde aplicável, e a estrutura de
   parágrafos/numeração (1.)(2.) intacta. Não resuma. Não omita detalhes.
   Não acrescente informação que não está no original.

7. **Tom**: português brasileiro moderno e legível. Evite arcaísmos
   desnecessários ("havia de ser", "fora") só quando soam naturais hoje.
   Preferir voz ativa quando possível.

**Tarefa:** Traduza os dois campos abaixo (text_easton_en e text_smith_en) para o português brasileiro. Se um dos campos estiver vazio, devolva null para aquele campo.

Devolva APENAS JSON válido (sem markdown, sem ```json```), neste schema:
{"slug": "<mesmo slug>", "lang": "pt", "text_easton": "<tradução ou null>", "text_smith": "<tradução ou null>", "confidence": 0.9, "notes": "auto: gemini-2.0-flash"}

---
Entrada:
slug: {slug}
name: {name}
source: {source}

text_easton_en:
{text_easton_en}

text_smith_en:
{text_smith_en}
---
JSON traduzido:"""


PROMPT_TEMPLATE_ES = """Eres un traductor especialista en literatura bíblica clásica. Tu tarea es traducir entradas del Diccionario Bíblico de Easton (1897) y Smith (1863) del inglés al **español latinoamericano** (registro neutro, estilo Reina-Valera / NVI).

**Reglas ABSOLUTAS de fidelidad:**

1. **Referencias bíblicas** en formato abreviado hispano (RVR):
   Gen.→Gn.  Ex.→Éx.  Lev.→Lv.  Num.→Nm.  Deut.→Dt.  Josh.→Jos.  Judg.→Jue.
   Ruth→Rt.  1 Sam.→1 Sm.  2 Sam.→2 Sm.  1 Kings→1 R.  2 Kings→2 R.
   1 Chr.→1 Cr.  2 Chr.→2 Cr.  Ezra→Esd.  Neh.→Neh.  Esth.→Est.  Job→Job
   Ps.→Sal.  Prov.→Pr.  Eccl.→Ec.  Song→Cnt.  Isa.→Is.  Jer.→Jer.  Lam.→Lm.
   Ezek.→Ez.  Dan.→Dn.  Hos.→Os.  Joel→Jl.  Amos→Am.  Obad.→Abd.  Jonah→Jon.
   Mic.→Miq.  Nah.→Nah.  Hab.→Hab.  Zeph.→Sof.  Hag.→Hag.  Zech.→Zac.  Mal.→Mal.
   Matt.→Mt.  Mark→Mr.  Luke→Lc.  John→Jn.  Acts→Hch.  Rom.→Ro.
   1 Cor.→1 Co.  2 Cor.→2 Co.  Gal.→Gá.  Eph.→Ef.  Phil.→Fil.  Col.→Col.
   1 Thess.→1 Ts.  2 Thess.→2 Ts.  1 Tim.→1 Tm.  2 Tim.→2 Tm.  Titus→Tit.
   Philem.→Flm.  Heb.→Heb.  James→Stg.  1 Pet.→1 P.  2 Pet.→2 P.
   1 John→1 Jn.  2 John→2 Jn.  3 John→3 Jn.  Jude→Jud.  Rev.→Ap.

2. **Nombres propios bíblicos** en español consagrado:
   Moses→Moisés  Aaron→Aarón  Miriam→Miriam  Abraham→Abraham  Isaac→Isaac
   Jacob→Jacob  Joseph→José  David→David  Solomon→Salomón  Elijah→Elías
   Elisha→Eliseo  Isaiah→Isaías  Jeremiah→Jeremías  Ezekiel→Ezequiel
   Daniel→Daniel  Peter→Pedro  Paul→Pablo  John→Juan  Matthew→Mateo
   Mark→Marcos  Luke→Lucas  Mary→María  Joshua→Josué  Noah→Noé
   Adam→Adán  Eve→Eva  Cain→Caín  Abel→Abel  Seth→Set
   Jehovah→Jehová  Christ→Cristo  Lord→Señor  God→Dios
   Pharaoh→Faraón  Zipporah→Séfora  Jochebed→Jocabed  Amram→Amram
   Nadab→Nadab  Abihu→Abiú  Eleazar→Eleazar  Ithamar→Itamar
   Elisheba→Elisabet  Amminadab→Aminadab  Hur→Hur  Korah→Coré
   Dathan→Datán  Abiram→Abiram  Azariah→Azarías  Shadrach→Sadrac
   Meshach→Mesac  Jehoiada→Joiada  Benaiah→Benaía  Zadok→Sadoc
   Eli→Elí  Abiathar→Abiatar  Sennacherib→Senaquerib  Ahasuerus→Asuero
   Jephthah→Jefté  Josiah→Josías  Huldah→Hulda  Achbor→Acbor
   Hezekiah→Ezequías  Ammonites→amonitas  Gadite→gadita  Levite→levita
   Benjamin→Benjamín  Naphtali→Neftalí  Asher→Aser  Judah→Judá
   Manasseh→Manasés  Ephraim→Efraín  Reuben→Rubén  Simeon→Simeón

3. **Lugares** en español consagrado:
   Egypt→Egipto  Babylon→Babilonia  Damascus→Damasco  Jerusalem→Jerusalén
   Samaria→Samaria  Syria→Siria  Arabia→Arabia  Assyria→Asiria
   Persia→Persia  Greece→Grecia  Rome→Roma  Lebanon→Líbano
   Mesopotamia→Mesopotamia  Armenia→Armenia  Sinai→Sinaí  Horeb→Horeb
   Jordan→Jordán  Dead Sea→mar Muerto  Red Sea→mar Rojo
   Canaan→Canaán  Philistia→Filistea  Moab→Moab  Edom→Edom
   Ararat→Ararat  Paran→Parán  Hazeroth→Hazerot  Meribah→Meriba
   Kadesh→Cades  Bethel→Betel  Bethlehem→Belén  Hebron→Hebrón
   Jericho→Jericó  Nazareth→Nazaret  Galilee→Galilea  Judea→Judea
   Ephesus→Éfeso  Corinth→Corinto  Antioch→Antioquía

4. **Términos eclesiásticos/teológicos**:
   covenant→pacto  tabernacle→tabernáculo  priest→sacerdote
   high priest→sumo sacerdote  altar→altar  temple→templo
   ark→arca  deluge→diluvio  prophet→profeta  prophetess→profetisa
   tribe→tribu  Levitical→levítica  Promised Land→Tierra Prometida
   Mount Sinai→monte Sinaí  Exodus (el evento)→Éxodo
   Ten Commandments→Diez Mandamientos  Passover→Pascua  Sabbath→sábado
   eunuch→eunuco  gentile→gentil  Greek→griego  Hebrew→hebreo

5. **Otros**:
   B.C.→a.C.  A.D.→d.C.  Comp.→Comp.  marg.→marg.  See X→Véase X
   R.V.→R.V.  A.V.→A.V.  LXX→LXX  Targum→Targum
   miles→millas  feet→pies  acres→acres (mantener unidades originales)
   Mohammedan→musulmán  Koran→Corán  rabbins/rabbis→rabinos

6. **Preservación**: mantén TODAS las referencias entre paréntesis (Gn. 8:4),
   comillas "curvas" originales, cursivas donde corresponda, y la estructura
   de párrafos/numeración (1.)(2.) intacta. No resumas. No omitas detalles.
   No agregues información que no está en el original.

7. **Tono**: español latinoamericano moderno y legible. Estilo ARA/RVR60
   donde sea natural, sin arcaísmos innecesarios. Preferir voz activa
   cuando sea posible.

**Tarea:** Traduce los dos campos abajo (text_easton_en y text_smith_en) al español latinoamericano. Si uno de los campos está vacío, devuelve null para ese campo.

Devuelve SOLO JSON válido (sin markdown, sin ```json```), en este esquema:
{"slug": "<mismo slug>", "lang": "es", "text_easton": "<traducción o null>", "text_smith": "<traducción o null>", "confidence": 0.9, "notes": "auto: gemini-2.0-flash"}

---
Entrada:
slug: {slug}
name: {name}
source: {source}

text_easton_en:
{text_easton_en}

text_smith_en:
{text_smith_en}
---
JSON traducido:"""


def build_prompt(row: dict, lang: str) -> str:
    template = PROMPT_TEMPLATE_PT if lang == "pt" else PROMPT_TEMPLATE_ES
    return template.replace("{slug}", row["slug"]) \
                   .replace("{name}", row["name"]) \
                   .replace("{source}", row["source"]) \
                   .replace("{text_easton_en}", row.get("text_easton_en") or "(vazio)") \
                   .replace("{text_smith_en}", row.get("text_smith_en") or "(vazio)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate dictionary batch via Gemini")
    parser.add_argument("--input", required=True, help="TSV from prep_dictionary_batch.py")
    parser.add_argument("--lang", choices=["pt", "es"], required=True)
    parser.add_argument("--out", required=True, help="Output JSONL path")
    parser.add_argument("--limit", type=int, default=None, help="Cap to first N rows")
    args = parser.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"ERROR: input not found: {in_path}", file=sys.stderr)
        sys.exit(1)

    with open(in_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))
    if args.limit:
        rows = rows[:args.limit]

    print(f"Translating {len(rows)} entries to {args.lang.upper()} via Gemini...",
          file=sys.stderr, flush=True)

    # Lower RPM on free tier to stay under the input-tokens-per-minute bucket.
    # Some entries (aaron, aarat) are 3-5k tokens each — 15 RPM easily trips
    # the 1M-tokens/min ceiling. 6 RPM keeps us comfortably below it.
    # Model: gemini-2.5-flash (gemini-2.0-flash is deprecated for new users).
    import time
    client = GeminiClient(
        cache_dir=CACHE_DIR,
        rpm=6,
        model="gemini-2.5-flash",
    )
    out_lines: list[str] = []
    errors = 0

    def call_with_retry(prompt: str, cache_key: str, max_retries: int = 4) -> dict:
        """Retry on 429 / ResourceExhausted, backing off per the server hint."""
        delay = 10.0
        for attempt in range(1, max_retries + 1):
            try:
                return client.generate_json(prompt, cache_key=cache_key)
            except Exception as e:
                msg = str(e).lower()
                if "429" in msg or "resource_exhausted" in msg or "quota" in msg:
                    wait = delay * attempt
                    print(f"    rate-limited; sleeping {wait:.0f}s…",
                          file=sys.stderr, flush=True)
                    time.sleep(wait)
                    continue
                raise
        raise RuntimeError(f"exhausted retries after {max_retries} attempts")

    for i, row in enumerate(rows, 1):
        slug = row["slug"]
        cache_key = f"dict_{args.lang}_{slug}.json"
        prompt = build_prompt(row, args.lang)
        try:
            obj = call_with_retry(prompt, cache_key)
            if "parse_error" in obj:
                raise ValueError(f"JSON parse failed: {obj['parse_error']}")
            # Defensive: ensure fields we care about
            obj["slug"] = slug
            obj["lang"] = args.lang
            obj.setdefault("confidence", 0.9)
            obj.setdefault("notes", "auto: gemini-2.0-flash")
            out_lines.append(json.dumps(obj, ensure_ascii=False))
            print(f"  [{i}/{len(rows)}] {slug} ok", file=sys.stderr, flush=True)
        except Exception as e:
            errors += 1
            print(f"  [{i}/{len(rows)}] {slug} ERROR — {e}", file=sys.stderr, flush=True)

    Path(args.out).write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(f"\nOK  Wrote {len(out_lines)} entries ({errors} errors) to {args.out}",
          file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
