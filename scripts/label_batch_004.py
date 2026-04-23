"""A4 — labeling for PSA batch_004 (PSA.40.15 .. PSA.62.12)."""
import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
import sys
BOOK = sys.argv[1] if len(sys.argv) > 1 else "PSA"
BATCH = sys.argv[2] if len(sys.argv) > 2 else "004"
INP = ROOT / f"data/processed/sentiment_pt/{BOOK}/batch_{BATCH}_input.tsv"
OUT = ROOT / f"data/processed/sentiment_pt/{BOOK}/batch_{BATCH}_output.jsonl"

POS = {
    # joy / praise / trust / salvation / protection
    "alegr": 2, "regozij": 2, "exult": 2, "jubil": 2, "cant": 1,
    "louv": 2, "glorific": 2, "bendi": 2, "bendig": 2, "bendit": 2, "bendiz": 2,
    "salva": 2, "salvacao": 2, "salvação": 2, "libert": 1, "livrar": 1, "resgat": 1,
    "protege": 2, "protetor": 1, "escudo": 1, "refugio": 2, "refúgio": 2,
    "amor": 1, "fiel": 1, "fidelidade": 2, "bondade": 2, "misericord": 2,
    "paz": 1, "esperanc": 2, "esperanç": 2, "confi": 1, "benção": 2, "bencao": 2, "abençoa": 2,
    "feliz": 2, "felicidade": 2, "contente": 1, "grato": 1, "graças": 1,
    "dádiva": 1, "dadiva": 1, "fortaleza": 1, "rocha": 1, "socorro": 1,
    "bom ": 1, "bem-aventur": 2, "digno": 1, "santo": 1, "bondoso": 1,
}

NEG = {
    # grief / enemies / wrath / death / shame / sin
    "ira": 2, "furor": 2, "fúria": 2, "furia": 2, "colera": 1, "cólera": 1, "indign": 1,
    "destru": 2, "destroi": 2, "destrói": 2, "aniquil": 2, "devor": 1, "consom": 1,
    "morte": 2, "mort": 1, "matar": 2, "pereç": 2, "perec": 1, "sepultur": 1, "tumulo": 1,
    "inimig": 1, "adversári": 1, "malign": 2, "ímpio": 2, "impio": 2, "malvad": 2, "iniqu": 2,
    "pecado": 1, "pecador": 1, "peque": 1, "pecaste": 1, "transgred": 1, "transgress": 1, "iniquid": 2, "culpa": 1, "vergonha": 2, "condenar": 1, "reprov": 1,
    "quebr": 1, "arranca": 1, "arranc": 1, "ferir": 1, "leao": 1, "leão": 1, "leoes": 1, "leões": 1,
    "derrot": 1, "derrub": 1, "cair": 1, "tropec": 1, "cativ": 1, "escrav": 1,
    "afliç": 2, "aflic": 2, "angustia": 2, "angústia": 2, "sofri": 1, "dor ": 1, "choro": 2, "lagrim": 2, "lágrim": 2,
    "medo": 1, "terror": 2, "aterroriz": 2, "pavor": 2, "trem": 1,
    "lament": 1, "gem": 1, "clam": 1, "grit": 1, "abandon": 2,
    "odia": 2, "ódio": 2, "odio": 2, "vinganc": 1, "vingança": 1, "maldiç": 2, "maldic": 2,
    "engan": 1, "mentir": 1, "mentiros": 2, "fals": 1, "traidor": 2, "trai ": 1,
    "zombam": 1, "zomb": 1, "escarn": 2, "oprim": 2, "opress": 2,
    "mal ": 1, "males": 1, "desgrac": 1, "desgraç": 1, "ruina": 2, "ruína": 2,
    "espada": 1, "ferid": 1, "sang": 1, "osso": 1, "derrub": 1, "cai": 1,
    "fossa": 1, "cova": 1, "abismo": 2, "tenebr": 1, "trev": 1, "escurid": 1,
    "chocad": 1, "confund": 1, "humilha": 1, "amaldi": 2,
}

LEVELS = [-1.0, -0.7, -0.4, -0.2, 0.0, 0.2, 0.4, 0.7, 1.0]


def snap(x: float) -> float:
    return min(LEVELS, key=lambda lv: abs(lv - x))


def score_pt(text: str) -> tuple[float, float]:
    """Return (pos_strength, neg_strength) from weighted keyword hits."""
    t = text.lower()
    pos = sum(w for k, w in POS.items() if k in t)
    neg = sum(w for k, w in NEG.items() if k in t)
    return pos, neg


def label_verse(text_pt: str, polarity_en: float, label_en: str) -> tuple[float, str, float, str | None]:
    pos, neg = score_pt(text_pt)
    net = pos - neg
    total = pos + neg

    # Base polarity from PT lexicon
    if total == 0:
        # no strong PT markers — lean on EN
        pol = 0.2 * (1 if polarity_en > 0.15 else -1 if polarity_en < -0.15 else 0)
    else:
        # scale net into [-1, 1] range
        raw = net / max(total, 3)  # div by max(total,3) softens single-word verses
        # boost for multiple strong words on one side
        if pos >= 4 and neg == 0:
            raw = max(raw, 0.7)
        if neg >= 4 and pos == 0:
            raw = min(raw, -0.7)
        if pos >= 6 and neg == 0:
            raw = 1.0
        if neg >= 6 and pos == 0:
            raw = -1.0
        pol = max(-1.0, min(1.0, raw))

    # Light pull from EN when they agree in sign
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

    # Confidence
    pt_sign = 1 if net > 0 else -1 if net < 0 else 0
    en_sign = 1 if polarity_en > 0.15 else -1 if polarity_en < -0.15 else 0

    notes = None
    if total == 0 and en_sign == 0:
        conf = 0.5
    elif total >= 4 and pt_sign != 0:
        conf = 0.9
        if en_sign != 0 and en_sign != pt_sign:
            conf = 0.7
            notes = "EN↔PT divergem"
    elif total >= 2 and pt_sign != 0:
        if en_sign == pt_sign:
            conf = 0.8
        elif en_sign == 0:
            conf = 0.7
        else:
            conf = 0.6
            notes = "EN↔PT divergem"
    elif pos > 0 and neg > 0:
        conf = 0.4
        notes = "afetos mistos"
    else:
        conf = 0.6

    # Mixed affect flag
    if pos >= 2 and neg >= 2 and notes is None:
        notes = "mixed grief + hope"
        conf = min(conf, 0.6)

    return pol, lab, conf, notes


def main():
    df = pd.read_csv(INP, sep="\t", encoding="utf-8")
    rows = []
    for _, r in df.iterrows():
        pol, lab, conf, notes = label_verse(r["text_pt"], float(r["polarity_en"]), r["label_en"])
        rows.append({
            "verse_id": r["verse_id"],
            "polarity_pt": round(pol, 2),
            "label_pt": lab,
            "confidence": round(conf, 2),
            "notes": notes,
        })

    with OUT.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    # Validation
    n_in = len(df)
    n_out = len(rows)
    from collections import Counter
    dist = Counter(r["label_pt"] for r in rows)
    avg_conf = sum(r["confidence"] for r in rows) / n_out
    incoherent = [
        r for r in rows
        if (r["polarity_pt"] > 0.1 and r["label_pt"] != "positive")
        or (r["polarity_pt"] < -0.1 and r["label_pt"] != "negative")
        or (-0.1 <= r["polarity_pt"] <= 0.1 and r["label_pt"] != "neutral")
    ]
    print(f"input rows: {n_in}  output rows: {n_out}")
    print(f"distribution: {dict(dist)}")
    print(f"avg confidence: {avg_conf:.3f}")
    print(f"incoherent rows: {len(incoherent)}")
    assert n_in == n_out, "row count mismatch"
    assert not incoherent, f"label/polarity mismatch: {incoherent[:3]}"
    print("OK")


if __name__ == "__main__":
    main()
