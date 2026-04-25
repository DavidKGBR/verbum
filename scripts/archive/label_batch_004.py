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
    # gospel/john themes
    "luz": 1, "vida": 1, "verdade": 1, "verdadeir": 1, "cre ": 1, "creu": 1, "crer": 1, "crede": 1,
    "glori": 1, "glória": 1, "glorifi": 2, "eterna": 2, "eterno": 2, "ressurre": 2, "ressuscit": 2,
    "cur": 1, "curou": 2, "sarar": 2, "sarou": 2, "saro": 1, "restaur": 1, "perdoa": 2, "perdo": 1, "remiss": 1,
    "discipul": 0, "evangel": 1, "reino": 1, "filhos de deus": 2,
    "ama ": 1, "amou": 2, "amai": 2, "amado": 1, "amada": 1, "amor de": 1,
    "alegr": 2, "consol": 1, "pai ": 0,
    # Job positives (rare islands)
    "sabedoria": 2, "entendim": 1, "prudenc": 1, "prudênc": 1,
    "restaur": 2, "restit": 2, "redobr": 2, "dobr": 0,
    "justo": 1, "íntegro": 2, "integro": 2, "reto": 1, "piedoso": 1,
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
    # gospel narrative negatives
    "crucific": 2, "cruz": 1, "morr": 1, "morreu": 2, "morte ": 2, "sofre": 1, "sofrer": 1, "sofreu": 1, "padec": 2,
    "trev": 2, "escurid": 2, "cegue": 1, "cego": 1, "demon": 2, "possess": 1, "diabo": 2, "satan": 2, "tenta": 1, "tentou": 1,
    "fariseu": 1, "fariseus": 1, "escrib": 1, "hipocri": 2, "hipócrit": 2, "acusa": 1, "blasfem": 2,
    "chicote": 1, "açoit": 2, "acoit": 2, "preso": 1, "prenderam": 1, "prisa": 1, "prisão": 1,
    "traiç": 2, "traic": 2, "traiu": 2, "negou": 2, "nega-me": 1,
    "chorou": 2, "choram": 1, "pranto": 2, "luto": 1, "luta": 0,
    "doent": 1, "paralit": 1, "leproso": 2, "endemon": 2, "imundo": 1, "impuro": 1,
    "fome": 1, "sede ": 1, "nu ": 1, "tempestade": 1,
    # Job vocabulary
    "amargur": 2, "amarg": 1, "chaga": 2, "cinza": 1, "pó ": 0, "ulcer": 2, "verme": 1,
    "tormento": 2, "vitup": 2, "oprobrio": 2, "opróbrio": 2, "desprez": 2, "escarnec": 2,
    "nasc": 0, "amaldiçoar": 2, "amaldiçoe": 2, "infortun": 2,
    "calamidade": 2, "ruín": 2, "caótic": 1, "tenebros": 2,
    "soluc": 1, "gemido": 2, "suspir": 1, "queixa": 1,
    # Ecclesiastes (Qohelet) vocabulary
    "vaidade": 2, "inútil": 2, "inutil": 2, "inutilidade": 2, "absurd": 2,
    "nada faz sentido": 2, "não faz sentido": 2, "nao faz sentido": 2,
    "correr atrás do vento": 2, "correr atras do vento": 2,
    "fardo pesado": 1, "canseir": 1, "fadig": 1, "ansiedade": 1,
    "loucur": 1, "tolo": 1, "insensat": 1, "néscio": 1, "nescio": 1,
    "desprez": 1, "desesper": 2, "aborre": 1, "tristeza": 1, "dor ": 1,
    "desgosto": 2, "sofriment": 2, "injustiça": 2, "injustic": 2,
    "opressores": 1, "opressor": 1, "mal feito": 1, "maldade": 2,
    "esquec": 1, "morr": 1, "morrer": 1, "sepultur": 1, "pó ": 0,
    "ignorant": 1, "preguic": 1, "preguiç": 1,
}

# Extend POS with Ecclesiastes flavor
POS.update({
    "comer ": 1, "beber": 1, "come e beb": 2,
    "gozar": 2, "gozo": 2, "desfrut": 2, "prazer": 1,
    "coisas boas": 1, "recompensa": 1, "agrada": 1,
    "sábio": 1, "sabio": 1, "conhecimento": 1,
    "temer a deus": 2, "teme a deus": 2, "guarda os mandamentos": 2,
})

# Extend POS/NEG for F5 — NT Epistles + Apocalypse
POS.update({
    "graça": 1, "graca": 1, "comunhão": 1, "comunhao": 1,
    "fé ": 1, "fe ": 1, "fiéis": 1, "fieis": 1,
    "irmãos amados": 2, "amados": 1, "caríssimo": 1, "carissimo": 1,
    "santific": 1, "coroa": 1, "herança": 1, "heranc": 1,
    "vida eterna": 2, "salvação eterna": 2, "gloria eterna": 2, "glória eterna": 2,
    "vencedor": 2, "venceu": 1, "vitória": 2, "vitoria": 2,
    "nova jerusalém": 2, "nova jerusalem": 2, "nova terra": 1,
    "cordeiro": 1, "árvore da vida": 2, "arvore da vida": 2,
    "águas vivas": 2, "aguas vivas": 2, "enxugará": 2, "enxugara": 2,
    "aleluia": 2, "bodas do cordeiro": 2, "trono de deus": 1,
    "deus é amor": 2, "deus é luz": 2, "deus e amor": 2, "deus e luz": 2,
    "permanece": 0, "permaneçam": 1, "perseverai": 1, "perseverar": 1,
    "bem-aventurado": 2,
})
# F6 — Prophets (Ezekiel + Jonah + minor post-exilic)
POS.update({
    "coração novo": 2, "coracao novo": 2, "espírito novo": 2, "espirito novo": 2,
    "sol da justiça": 2, "sol da justica": 2,
    "remanescente": 1, "reviver": 2, "reviverão": 2, "reviverao": 2,
    "ossos secos": 0,
    "arrepend": 1, "arrependeu": 2, "arrependeram": 2,
    "o justo viverá pela fé": 2, "justo viverá": 2, "justo vivera": 2,
    "dízim": 0, "dizim": 0,
    "templo do senhor": 1, "reconstru": 1,
    "aliança eterna": 2, "alianca eterna": 2,
    "pastorear": 1, "apascent": 1,
    "perdoar": 1, "perdoarei": 2, "perdoar-lhes": 2,
})
NEG.update({
    "dia do senhor": 1, "dia da ira": 2,
    "espada, fome e peste": 2, "fome e peste": 2,
    "peste": 1, "cativeiro": 1, "deportad": 1,
    "idolatria": 2, "ídolos": 1, "idolos": 1, "ídolo": 1, "idolo": 1,
    "imagens esculpidas": 2, "altos": 0,
    "devastad": 2, "assolad": 2, "desolação": 2, "desolac": 2, "desert": 0,
    "prostituic": 2, "prostituí": 2, "prostitui": 2, "prostitut": 2, "adulterar": 1, "adulter": 1,
    "enfurec": 2, "enfureceu": 2, "descontente": 1, "indignad": 1, "furios": 2,
    "sangue derramado": 2, "sangues": 1,
    "ruína": 2, "ruin": 1, "ruína": 2,
    "nínive": 0, "ninive": 0,
    "devorar": 1, "pilhad": 2, "saque": 2, "saqueado": 2,
    "lamentação": 1, "lamentac": 1, "choro e ranger": 2,
    "gog ": 0, "magog": 0,
    "rebel": 1, "rebeldi": 2, "rebelou": 1, "rebelar": 1,
    "poluído": 1, "poluid": 1, "impur": 1,
})

# F7 — Monarchy + post-exile narrative (Kings/Chronicles/Ezra/Nehemiah)
POS.update({
    "edifica o templo": 2, "edificou o templo": 2, "construiu o templo": 2,
    "reconstru": 1, "restaurou": 2, "renovou a aliança": 2, "reformas": 1,
    "concertou": 1, "consertou": 1, "reparou": 1,
    "procura ao senhor": 2, "buscou ao senhor": 2, "buscar ao senhor": 2,
    "fez o que era reto": 2, "fez o que era certo": 2, "fez o que é reto": 2,
    "celebraram a páscoa": 2, "celebrou a páscoa": 2,
    "cantores": 1, "instrumentos": 0, "harpa": 0, "salteri": 0,
    "juramento": 0, "coração": 0,
    "oferta pacífica": 1, "ofertas pacíficas": 1,
})
NEG.update({
    "fez o que era mau": 2, "fez o que era mal": 2, "fez o mal": 2,
    "andou nos caminhos de jeroboão": 2, "jeroboão filho de nebate": 1,
    "altos não foram tirados": 1, "altos não foram removidos": 1,
    "nos pecados de jeroboão": 2,
    "queimou seus filhos": 2, "passou os filhos pelo fogo": 2,
    "exílio": 2, "exilio": 2, "deportou": 2, "deportou para": 2,
    "levado cativo": 2, "levaram cativos": 2, "incendi": 2, "queimaram": 2,
    "derribaram": 1, "saquearam": 2, "saqueou": 2, "pilhar": 2,
    "mulheres estrangeiras": 1, "casamentos mistos": 2,
    "conspiração": 2, "conspir": 1, "assassin": 2,
    "murmur": 1, "reclamaram": 1, "zombaram": 1, "escarneceram": 2,
})
NEG.update({
    "falsos mestres": 2, "falsos profetas": 2, "falso profeta": 2,
    "hereges": 2, "heresia": 2, "apostasia": 2, "apóstat": 2, "apostat": 2,
    "perdição": 2, "perdic": 2, "condenação": 2, "condena": 2,
    "perverso": 1, "perversão": 2, "perversao": 2, "depravad": 2, "corrupção": 1, "corrupcao": 1,
    "carnal": 1, "concupisc": 2, "libidin": 2, "lascívia": 2, "lascivia": 2,
    "impi": 1, "ímpios": 2, "impios": 2, "injust": 1,
    "ira de deus": 2, "dia do juízo": 2, "dia do juizo": 2, "juízo final": 2,
    "tormento": 2, "atorment": 2, "praga": 2, "pragas": 2,
    "fogo e enxofre": 2, "lago de fogo": 2, "lago que arde": 2,
    "besta": 1, "besta": 1, "dragão": 2, "dragao": 2, "serpente antiga": 2,
    "abismo": 2, "morte segunda": 2, "segunda morte": 2,
    "babilônia": 1, "babilonia": 1, "abominação": 2, "abominac": 2,
    "ai ": 1, "ai, ai": 2, "ai de": 1, "maldição": 2, "maldic": 2,
    "falta de amor": 2, "sem amor": 1, "odiai": 2,
})

LEVELS = [-1.0, -0.7, -0.4, -0.2, 0.0, 0.2, 0.4, 0.7, 1.0]


def snap(x: float) -> float:
    return min(LEVELS, key=lambda lv: abs(lv - x))


def score_pt(text: str) -> tuple[float, float]:
    """Return (pos_strength, neg_strength) from weighted keyword hits."""
    if not isinstance(text, str):
        return 0, 0
    t = text.lower()
    pos = sum(w for k, w in POS.items() if k in t)
    neg = sum(w for k, w in NEG.items() if k in t)
    return pos, neg


ESCHATOLOGICAL_POS = [
    "enxugará", "enxugara", "enxugar-lhes",
    "não haverá mais morte", "nao havera mais morte",
    "não haverá mais pranto", "não haverá mais choro",
    "novas todas as coisas",
    "já não haverá maldição", "ja nao havera maldic",
    "deus é amor", "deus e amor", "deus é luz", "deus e luz",
    "nova jerusalém", "nova jerusalem",
    "bodas do cordeiro",
    "árvore da vida", "arvore da vida",
]


def label_verse(text_pt: str, polarity_en: float, label_en: str) -> tuple[float, str, float, str | None]:
    if not isinstance(text_pt, str) or not text_pt.strip():
        text_pt = ""
    t_lower = text_pt.lower()
    # Eschatological / divine-attribute overrides — these phrases flip grief vocab
    override_pos = any(p in t_lower for p in ESCHATOLOGICAL_POS)
    pos, neg = score_pt(text_pt)
    net = pos - neg
    total = pos + neg
    if override_pos:
        pol = 0.7
        if polarity_en > 0.1:
            pol = 0.7
        lab = "positive"
        conf = 0.8
        notes = "eschatological consolation"
        return snap(pol), lab, conf, notes

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
