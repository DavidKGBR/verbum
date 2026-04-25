"""A4 — labeling for ES (RVR) batches. Usage: python scripts/label_batch_es.py BOOK BATCH"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BOOK = sys.argv[1] if len(sys.argv) > 1 else "MAT"
BATCH = sys.argv[2] if len(sys.argv) > 2 else "001"
INP = ROOT / f"data/processed/sentiment_es/{BOOK}/batch_{BATCH}_input.tsv"
OUT = ROOT / f"data/processed/sentiment_es/{BOOK}/batch_{BATCH}_output.jsonl"

# Spanish lexicon (RVR / Reina-Valera 1909 style — "é" in place of "y", old endings)
POS = {
    # joy / praise / trust / salvation / protection
    "alegr": 2, "regocij": 2, "gozo": 2, "gozar": 1, "exult": 2, "jubil": 2,
    "cant": 1, "alab": 2, "loar": 1, "glorific": 2, "bendij": 2, "bendice": 2,
    "bendit": 2, "bendic": 2, "bendecir": 2, "bendecid": 2,
    "salva": 2, "salvaci": 2, "salvador": 2, "liber": 1, "libr": 1, "rescat": 1,
    "protege": 2, "protector": 1, "escudo": 1, "refugio": 2,
    "amor": 1, "fiel": 1, "fidelid": 2, "bondad": 2, "misericord": 2,
    "paz": 1, "esperanz": 2, "confi": 1, "bendici": 2, "bendito": 2,
    "feliz": 2, "felicidad": 2, "contento": 1, "agradec": 1, "gracias": 1,
    "dádiva": 1, "dadiva": 1, "fortaleza": 1, "roca": 1, "socorro": 1, "ayuda": 1,
    "bueno": 1, "bienaventur": 2, "digno": 1, "santo": 1, "bondadoso": 1,
    # gospel/john themes
    "luz": 1, "vida": 1, "verdad": 1, "verdader": 1, "cree": 1, "creyó": 1, "creyo": 1,
    "creer": 1, "creed": 1, "creyen": 1, "creyere": 1,
    "gloria": 1, "glori": 1, "eterna": 2, "eterno": 2, "eternal": 2,
    "resurre": 2, "resucit": 2, "resurrec": 2,
    "sanar": 2, "sanó": 2, "sano": 1, "sana": 1, "sanidad": 2, "curar": 1,
    "restaur": 1, "perdon": 2, "perdó": 2, "remisi": 1,
    "discíp": 0, "discip": 0, "evangeli": 1, "reino": 1, "hijos de dios": 2,
    " ama ": 1, " amó": 2, " amo ": 1, " amad": 1, " amar": 1, " amando": 1,
    "consol": 1, "padre": 0,
    # wisdom
    "sabiduría": 2, "sabidur": 2, "entendim": 1, "prudenc": 1,
    "restit": 2, "justo": 1, "íntegro": 2, "integro": 2, "recto": 1, "piadoso": 1,
    # epistolary
    "gracia": 1, "comunión": 1, "comunion": 1,
    "fe ": 1, "fieles": 1, "hermanos amados": 2, "amados": 1, "amadísimo": 1, "carísimo": 1,
    "santific": 1, "corona": 1, "herencia": 1,
    "vida eterna": 2, "salvación eterna": 2, "gloria eterna": 2,
    "vencedor": 2, "venció": 1, "vencio": 1, "victoria": 2,
    "nueva jerusalén": 2, "nueva jerusalen": 2, "nueva tierra": 1,
    "cordero": 1, "árbol de la vida": 2, "arbol de la vida": 2,
    "aguas de vida": 2, "aguas vivas": 2, "enjugará": 2, "enjugara": 2, "enjugar": 2,
    "aleluya": 2, "bodas del cordero": 2, "trono de dios": 1,
    "dios es amor": 2, "dios es luz": 2,
    "permanec": 0, "perseverar": 1, "persever": 1,
    "bienaventurado": 2,
    # action verbs good
    "edific": 1, "reconstru": 1, "restaur": 1,
    "buscar al señor": 2, "buscó al señor": 2, "busca al señor": 2,
    "hizo lo recto": 2, "hizo lo bueno": 2, "celebró la pascua": 2,
    "arrepent": 1, "arrepint": 2, "se arrepintieron": 2,
    "corazón nuevo": 2, "corazon nuevo": 2, "espíritu nuevo": 2, "espiritu nuevo": 2,
    "sol de justicia": 2,
    "remanente": 1, "reviv": 2,
    "alianza eterna": 2, "pacto eterno": 2, "apacent": 1, "pastore": 1,
    "perdonar": 1, "perdonaré": 2, "perdonare": 2,
    # Ecclesiastes-like (for NT proverbs-esque: none common, but safe)
    "comer ": 1, "beber": 1, "goz": 1, "disfrut": 2, "placer": 1,
    "temer a dios": 2, "teme a dios": 2, "guarda los mandamientos": 2,
}

NEG = {
    # grief / enemies / wrath / death / shame / sin
    "ira": 2, "furor": 2, "furia": 2, "cólera": 1, "colera": 1, "indign": 1,
    "destru": 2, "aniquil": 2, "devor": 1, "consum": 1,
    "muerte": 2, "muert": 1, "matar": 2, "mataron": 2, "matado": 1,
    "perec": 2, "perecer": 2, "sepultur": 1, "tumba": 1,
    "enemig": 1, "adversari": 1, "malign": 2, "impío": 2, "impio": 2, "malvad": 2, "inicu": 2, "iniquid": 2,
    "pecado": 1, "pecador": 1, "peque": 1, "pecaste": 1, "transgred": 1, "transgres": 1,
    "culpa": 1, "vergüenz": 2, "verguenz": 2, "condena": 1, "repro": 1,
    "quebr": 1, "arranca": 1, "arranc": 1, "herir": 1, "león": 1, "leon": 1, "leones": 1,
    "derrot": 1, "derrib": 1, "caer": 1, "tropez": 1, "cautiv": 1, "esclav": 1,
    "aflicc": 2, "aflicción": 2, "angustia": 2, "sufri": 1, "dolor": 1, "lloro": 2, "lágrim": 2, "lagrim": 2,
    "miedo": 1, "temor": 1, "terror": 2, "aterroriz": 2, "pavor": 2, "tembl": 1,
    "lament": 1, "gem": 1, "clam": 1, "grit": 1, "abandon": 2, "desampar": 2,
    "odia": 2, "odio": 2, "odiar": 2, "venganza": 1, "venganc": 1, "maldic": 2, "maldici": 2,
    "engañ": 1, "engan": 1, "menti": 1, "mentiros": 2, "falso": 1, "falsa": 1, "fals": 1, "traidor": 2, "trai ": 1,
    "burla": 1, "burl": 1, "escarn": 2, "oprim": 2, "opres": 2,
    "mal ": 1, "males": 1, "desgrac": 1, "ruina": 2,
    "espada": 1, "herid": 1, "sangre": 1, "sang": 1, "hueso": 0,
    "fosa": 1, "hoyo": 1, "abismo": 2, "tenebr": 1, "tinieblas": 2, "oscurid": 1,
    "humilla": 1, "afrenta": 2, "amaldit": 2,
    # gospel narrative negatives
    "crucific": 2, "cruz": 1, "morir": 1, "murió": 2, "murio": 2, "muriéndose": 2,
    "sufre": 1, "sufrir": 1, "sufrió": 1, "sufrio": 1, "padec": 2, "padecer": 2,
    "ciegue": 1, "ciego": 1, "demon": 2, "posesión": 1, "posei": 1, "diablo": 2, "satan": 2, "tenta": 1, "tentó": 1, "tento": 1,
    "fariseo": 1, "fariseos": 1, "escrib": 1, "hipócrit": 2, "hipocrit": 2, "acus": 1, "blasfem": 2,
    "azot": 2, "azote": 2, "preso": 1, "prendi": 1, "prendieron": 1, "prisión": 1, "prision": 1,
    "traici": 2, "traición": 2, "traicio": 2, "traicionó": 2, "negó": 2, "nego": 2,
    "lloró": 2, "lloro": 1, "lloran": 1, "llanto": 2, "luto": 1,
    "enferm": 1, "paralit": 1, "leproso": 2, "endemon": 2, "inmundo": 1, "impuro": 1,
    "hambre": 1, "sed ": 1, "desnud": 1, "tempest": 1,
    # Job/lament vocab
    "amargur": 2, "amarg": 1, "llaga": 2, "ceniza": 1, "úlcer": 2, "ulcer": 2, "gusano": 1,
    "tormento": 2, "vituper": 2, "oprobio": 2, "desprec": 2, "escarnec": 2,
    "calamidad": 2, "gemido": 2, "suspir": 1, "queja": 1, "quej": 1,
    # Ecclesiastes (not in NT, but keep generic)
    "vanidad": 2, "inútil": 2, "inutil": 2, "absurd": 2,
    "locura": 1, "necio": 1, "insensat": 1, "desesper": 2, "aborre": 1, "tristeza": 1,
    # epistolary/apocalyptic negatives
    "falsos maestros": 2, "falsos profetas": 2, "falso profeta": 2,
    "herej": 2, "apostas": 2, "apóstat": 2, "apostat": 2,
    "perdici": 2, "condenaci": 2,
    "perverso": 1, "perversi": 2, "deprav": 2, "corrupci": 1,
    "carnal": 1, "concupisc": 2, "lascivia": 2, "lascivi": 2,
    "impío": 1, "impíos": 2, "impios": 2, "injust": 1,
    "ira de dios": 2, "día del juicio": 2, "dia del juicio": 2, "juicio final": 2,
    "atorment": 2, "plaga": 2, "plagas": 2,
    "fuego y azufre": 2, "lago de fuego": 2, "lago que arde": 2,
    "bestia": 1, "dragón": 2, "dragon": 2, "serpiente antigua": 2,
    "muerte segunda": 2, "segunda muerte": 2,
    "babilonia": 1, "abominaci": 2, "abominac": 2,
    "¡ay": 1, " ay ": 1, " ay,": 1, " ay.": 1, "ay de": 1,
    # prophetic
    "día del señor": 1, "dia del señor": 1, "día de la ira": 2, "dia de la ira": 2,
    "peste": 1, "cautiverio": 1, "deport": 1,
    "idolatría": 2, "idolatr": 2, "ídolos": 1, "idolos": 1, "ídolo": 1, "idolo": 1,
    "imágenes esculpidas": 2, "imagenes esculpidas": 2,
    "devastad": 2, "asolad": 2, "desolaci": 2,
    "prostitu": 2, "adulter": 1, "fornic": 2,
    "enfurec": 2, "airad": 2, "enojad": 1, "furios": 2,
    "sangre derramada": 2,
    "pillaje": 2, "saque": 2, "saqu": 2,
    "rebeli": 1, "rebel": 1, "rebelde": 1,
    # monarchy negatives
    "hizo lo malo": 2, "hizo el mal": 2,
    "anduvo en los caminos de jeroboam": 2,
    "altos no fueron quitados": 1, "altos no fueron removidos": 1,
    "pasó a sus hijos por el fuego": 2,
    "exilio": 2, "desterr": 2, "llevaron cautivos": 2, "llevado cautivo": 2,
    "incendi": 2, "quemaron": 2, "saquear": 2,
    "mujeres extranjeras": 1, "casamientos mixtos": 2,
    "conspiraci": 2, "conspir": 1, "asesin": 2,
    "murmur": 1, "reclamaron": 1,
}

LEVELS = [-1.0, -0.7, -0.4, -0.2, 0.0, 0.2, 0.4, 0.7, 1.0]


def snap(x: float) -> float:
    return min(LEVELS, key=lambda lv: abs(lv - x))


def score_es(text: str) -> tuple[float, float]:
    if not isinstance(text, str):
        return 0, 0
    t = text.lower()
    pos = sum(w for k, w in POS.items() if k in t)
    neg = sum(w for k, w in NEG.items() if k in t)
    return pos, neg


ESCHATOLOGICAL_POS = [
    "enjugará", "enjugara", "enjugar",
    "no habrá más muerte", "no habra mas muerte",
    "no habrá más llanto", "no habra mas llanto",
    "hago nuevas todas las cosas",
    "no habrá más maldici", "no habra mas maldici",
    "dios es amor", "dios es luz",
    "nueva jerusalén", "nueva jerusalen",
    "bodas del cordero",
    "árbol de la vida", "arbol de la vida",
    "ha resucitado", "ha resucitad", "resucitó", "resucito",
]


def label_verse(text_es: str, polarity_en: float, label_en: str) -> tuple[float, str, float, str | None]:
    if not isinstance(text_es, str) or not text_es.strip():
        text_es = ""
    t_lower = text_es.lower()
    override_pos = any(p in t_lower for p in ESCHATOLOGICAL_POS)
    pos, neg = score_es(text_es)
    net = pos - neg
    total = pos + neg
    if override_pos:
        pol = 0.7
        lab = "positive"
        conf = 0.8
        notes = "eschatological consolation"
        return snap(pol), lab, conf, notes

    if total == 0:
        pol = 0.2 * (1 if polarity_en > 0.15 else -1 if polarity_en < -0.15 else 0)
    else:
        raw = net / max(total, 3)
        if pos >= 4 and neg == 0:
            raw = max(raw, 0.7)
        if neg >= 4 and pos == 0:
            raw = min(raw, -0.7)
        if pos >= 6 and neg == 0:
            raw = 1.0
        if neg >= 6 and pos == 0:
            raw = -1.0
        pol = max(-1.0, min(1.0, raw))

    if polarity_en > 0.2 and pol > 0:
        pol = min(1.0, pol + 0.1)
    elif polarity_en < -0.2 and pol < 0:
        pol = max(-1.0, pol - 0.1)

    pol = snap(pol)

    if pol > 0.1:
        lab = "positive"
    elif pol < -0.1:
        lab = "negative"
    else:
        lab = "neutral"

    pt_sign = 1 if net > 0 else -1 if net < 0 else 0
    en_sign = 1 if polarity_en > 0.15 else -1 if polarity_en < -0.15 else 0

    notes = None
    if total == 0 and en_sign == 0:
        conf = 0.5
    elif total >= 4 and pt_sign != 0:
        conf = 0.9
        if en_sign != 0 and en_sign != pt_sign:
            conf = 0.7
            notes = "EN↔ES divergen"
    elif total >= 2 and pt_sign != 0:
        if en_sign == pt_sign:
            conf = 0.8
        elif en_sign == 0:
            conf = 0.7
        else:
            conf = 0.6
            notes = "EN↔ES divergen"
    elif pos > 0 and neg > 0:
        conf = 0.4
        notes = "afectos mixtos"
    else:
        conf = 0.6

    if pos >= 2 and neg >= 2 and notes is None:
        notes = "mixed grief + hope"
        conf = min(conf, 0.6)

    return pol, lab, conf, notes


def main():
    df = pd.read_csv(INP, sep="\t", encoding="utf-8")
    rows = []
    for _, r in df.iterrows():
        pol_en = r.get("polarity_en", 0.0)
        if not isinstance(pol_en, (int, float)) or pd.isna(pol_en):
            pol_en = 0.0
        lab_en = r.get("label_en", "neutral")
        if not isinstance(lab_en, str):
            lab_en = "neutral"
        pol, lab, conf, notes = label_verse(r["text_es"], float(pol_en), lab_en)
        rows.append({
            "verse_id": r["verse_id"],
            "polarity_es": round(pol, 2),
            "label_es": lab,
            "confidence": round(conf, 2),
            "notes": notes,
        })

    with OUT.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    n_in = len(df)
    n_out = len(rows)
    from collections import Counter
    dist = Counter(r["label_es"] for r in rows)
    avg_conf = sum(r["confidence"] for r in rows) / n_out
    incoherent = [
        r for r in rows
        if (r["polarity_es"] > 0.1 and r["label_es"] != "positive")
        or (r["polarity_es"] < -0.1 and r["label_es"] != "negative")
        or (-0.1 <= r["polarity_es"] <= 0.1 and r["label_es"] != "neutral")
    ]
    print(f"[{BOOK}/{BATCH}] input: {n_in}  output: {n_out}")
    print(f"  distribution: {dict(dist)}")
    print(f"  avg confidence: {avg_conf:.3f}")
    print(f"  incoherent: {len(incoherent)}")
    assert n_in == n_out, "row count mismatch"
    assert not incoherent, f"label/polarity mismatch: {incoherent[:3]}"
    print("  OK")


if __name__ == "__main__":
    main()
