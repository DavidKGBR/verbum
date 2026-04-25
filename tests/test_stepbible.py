"""
🧪 Tests — STEPBible interlinear extractor (Task #3d)
"""

# ruff: noqa: E501  — TSV fixtures have intentionally long lines

from __future__ import annotations

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.stepbible_extractor import (
    StepBibleExtractor,
    _extract_grammar_after_equals,
    _extract_tahot_root_lemma_gloss,
    _normalize_strongs,
    _parse_ref,
    _split_lemma_gloss,
    _split_word_transliteration,
)
from src.load.duckdb_loader import DuckDBLoader
from src.models.schemas import (
    InterlinearLanguage,
    InterlinearWord,
    StrongsEntry,
    StrongsLanguage,
)

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def tmp_db(tmp_path):
    cfg = LoadConfig(duckdb_path=str(tmp_path / "test.duckdb"))
    loader = DuckDBLoader(cfg)
    loader.create_schema()
    yield loader
    loader.close()


# Minimal TAGNT excerpt — header + 1 verse block
_SAMPLE_TAGNT = """TAGNT Mat-Jhn - Translators Amalgamated Greek NT - CC BY 4.0
=================================================
License stuff that spans several lines...
And more license
=================================================

FIELD DESCRIPTIONS:
Reference: Versification as used by NRSV.
Word Type: Indicates where the word is found.

==========================================================

# Mat.1.1\tΒίβλος\tγενέσεως\tἸησοῦ
#_Translation\t[The] book\tof [the] genealogy\tof Jesus
#_Word=Grammar\tG0976=N-NSF\tG1078=N-GSF\tG2424G=N-GSM-P

Word & Type\tGreek\tEnglish translation\tdStrongs = Grammar\tDictionary form =  Gloss\teditions\tMeaning variants\tSpelling variants\tSpanish translation\tSub-meaning\tConjoin word\tsStrong+Instance\tAlt Strongs
Mat.1.1#01=NKO\tΒίβλος (Biblos)\t[The] book\tG0976=N-NSF\tβίβλος=book\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\t\tLibro\tbook\t#01\tG0976
Mat.1.1#02=NKO\tγενέσεως (geneseōs)\tof [the] genealogy\tG1078=N-GSF\tγένεσις=origin\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\t\tde origen\torigin\t#02\tG1078
Mat.1.1#03=NKO\tἸησοῦ (Iēsou)\tof Jesus\tG2424G=N-GSM-P\tἸησοῦς=Jesus/Joshua\tNA28+NA27+Tyn+SBL+WH+Treg+TR+Byz\t\t\tde Jesús\tJesus»Jesus|Jesus@Mat.1.1\t#03\tG2424
"""

# Minimal TAHOT excerpt
_SAMPLE_TAHOT = """TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - CC BY 4.0
===================================
Lots of license header
===================================

Field descriptions etc.

# Gen.1.1\tבְּרֵאשִׁ֖ית\tבָּרָ֣א\tאֱלֹהִ֑ים
#_Translation\tin [the] beginning\tcreated\tGod

Eng (Heb) Ref & Type\tHebrew\tTransliteration\tTranslation\tdStrongs\tGrammar\tMeaning Variants\tSpelling Variants\tRoot dStrong+Instance\tAlternative Strongs+Instance\tConjoin word\tExpanded Strong tags
Gen.1.1#01=L\tבְּ/רֵאשִׁ֖ית\tbe./re.Shit\tin/ [the] beginning\tH9003/{H7225}\tHR/Ncfsa\t\t\tH7225\t\t\tH9003=ב=in/{H7225=רֵאשִׁית=beginning}
Gen.1.1#02=L\tבָּרָ֣א\tba.Ra'\tcreated\t{H1254A}\tHVqp3ms\t\t\tH1254A\t\t\t{H1254A=בָּרָא=to create}
Gen.1.1#03=L\tאֱלֹהִ֑ים\t'E.lo.Him\tGod\t{H0430G}\tHNcmpa\t\t\tH0430G\t\t\t{H0430G=אֱלֹהִים=God»LORD@Gen.1.1-Heb}
"""


# ─── _normalize_strongs ──────────────────────────────────────────────────────


class TestNormalizeStrongs:
    def test_plain_greek(self):
        assert _normalize_strongs("G0976=N-NSF") == "G976"

    def test_plain_hebrew(self):
        assert _normalize_strongs("H0559") == "H559"

    def test_braced_hebrew_root(self):
        # Multi-morpheme lemma: picks the root inside {}
        assert _normalize_strongs("H9003/{H7225}") == "H7225"

    def test_braced_with_letter_suffix(self):
        # Homograph suffix like G2424G is trimmed
        assert _normalize_strongs("{H0776G}") == "H776"

    def test_bare_with_slash(self):
        # If there's no {}, falls back to the first Strong's
        assert _normalize_strongs("H9001/H0559") == "H9001"

    def test_empty(self):
        assert _normalize_strongs("") is None
        assert _normalize_strongs(None) is None


# ─── _parse_ref ──────────────────────────────────────────────────────────────


class TestParseRef:
    def test_greek(self):
        assert _parse_ref("Mat.1.1#01=NKO") == ("MAT", 1, 1, 1)

    def test_hebrew(self):
        assert _parse_ref("Gen.1.1#01=L") == ("GEN", 1, 1, 1)

    def test_position_multi_digit(self):
        assert _parse_ref("Psa.119.176#17=L") == ("PSA", 119, 176, 17)

    def test_unknown_book_returns_none(self):
        assert _parse_ref("Xyz.1.1#01=L") is None

    def test_malformed_returns_none(self):
        assert _parse_ref("not a ref") is None
        assert _parse_ref("Mat.1") is None


# ─── Cell helpers ────────────────────────────────────────────────────────────


class TestCellHelpers:
    def test_split_word_transliteration_with_parens(self):
        assert _split_word_transliteration("Βίβλος (Biblos)") == ("Βίβλος", "Biblos")

    def test_split_word_transliteration_without_parens(self):
        assert _split_word_transliteration("בְּרֵאשִׁית") == ("בְּרֵאשִׁית", None)

    def test_grammar_after_equals(self):
        assert _extract_grammar_after_equals("G0976=N-NSF") == "N-NSF"

    def test_grammar_none_on_complex(self):
        # Hebrew multi-morpheme expressions shouldn't pull a grammar here
        assert _extract_grammar_after_equals("H9003/{H7225}") is None

    def test_split_lemma_gloss(self):
        assert _split_lemma_gloss("βίβλος=book") == ("βίβλος", "book")
        assert _split_lemma_gloss("") == (None, None)

    def test_tahot_root_extraction(self):
        expanded = "H9003=ב=in/{H7225=רֵאשִׁית=beginning}"
        lemma, gloss = _extract_tahot_root_lemma_gloss(expanded)
        assert lemma == "רֵאשִׁית"
        assert gloss == "beginning"

    def test_tahot_root_with_semantic_tag(self):
        expanded = "{H0430G=אֱלֹהִים=God»LORD@Gen.1.1-Heb}"
        lemma, gloss = _extract_tahot_root_lemma_gloss(expanded)
        assert lemma == "אֱלֹהִים"
        # Gloss includes the disambiguation — OK for v1
        assert gloss is not None and "God" in gloss


# ─── Parser integration (fixture → InterlinearWord) ──────────────────────────


class TestParseTagnt:
    def test_parses_three_words(self):
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAGNT,
                InterlinearLanguage.GREEK,
                "tagnt",
                ex._parse_row_tagnt,
            )
        )
        assert len(words) == 3

    def test_first_word_fields(self):
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAGNT,
                InterlinearLanguage.GREEK,
                "tagnt",
                ex._parse_row_tagnt,
            )
        )
        w = words[0]
        assert w.verse_id == "MAT.1.1"
        assert w.word_position == 1
        assert w.language == InterlinearLanguage.GREEK
        assert w.source == "tagnt"
        assert w.original_word == "Βίβλος"
        assert w.transliteration == "Biblos"
        assert w.english == "[The] book"
        assert w.strongs_id == "G976"
        assert w.strongs_raw == "G0976=N-NSF"
        assert w.grammar == "N-NSF"
        assert w.lemma == "βίβλος"
        assert w.gloss == "book"
        assert w.semantic_tag == "book"

    def test_disambiguated_semantic_tag(self):
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAGNT,
                InterlinearLanguage.GREEK,
                "tagnt",
                ex._parse_row_tagnt,
            )
        )
        # Mat.1.1#03 is Ἰησοῦ → tagged as the person Jesus
        jesus = words[2]
        assert jesus.original_word == "Ἰησοῦ"
        assert jesus.semantic_tag == "Jesus»Jesus|Jesus@Mat.1.1"
        assert jesus.strongs_id == "G2424"


class TestParseTahot:
    def test_parses_three_words(self):
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAHOT,
                InterlinearLanguage.HEBREW,
                "tahot",
                ex._parse_row_tahot,
            )
        )
        assert len(words) == 3

    def test_first_word_normalises_root_strongs(self):
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAHOT,
                InterlinearLanguage.HEBREW,
                "tahot",
                ex._parse_row_tahot,
            )
        )
        w = words[0]
        assert w.verse_id == "GEN.1.1"
        assert w.language == InterlinearLanguage.HEBREW
        assert w.strongs_id == "H7225"  # root, not H9003 prefix
        assert w.original_word == "בְּ/רֵאשִׁ֖ית"
        assert w.transliteration == "be./re.Shit"
        assert w.english == "in/ [the] beginning"
        assert w.lemma == "רֵאשִׁית"
        assert w.gloss == "beginning"

    def test_skip_license_header(self):
        """License and comment lines must not become InterlinearWord rows."""
        ex = StepBibleExtractor()
        words = list(
            ex._parse(
                _SAMPLE_TAHOT,
                InterlinearLanguage.HEBREW,
                "tahot",
                ex._parse_row_tahot,
            )
        )
        # None of the words should contain "License" or "Field descriptions"
        for w in words:
            assert w.original_word
            assert "License" not in (w.english or "")


# ─── Loader + JOIN with strongs_lexicon ──────────────────────────────────────


def _to_df(words: list[InterlinearWord]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "verse_id": w.verse_id,
                "word_position": w.word_position,
                "language": w.language.value,
                "source": w.source,
                "original_word": w.original_word,
                "transliteration": w.transliteration,
                "english": w.english,
                "strongs_id": w.strongs_id,
                "strongs_raw": w.strongs_raw,
                "grammar": w.grammar,
                "lemma": w.lemma,
                "gloss": w.gloss,
                "semantic_tag": w.semantic_tag,
            }
            for w in words
        ]
    )


def _strongs_df(entries: list[StrongsEntry]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "strongs_id": e.strongs_id,
                "language": e.language.value,
                "original": e.original,
                "transliteration": e.transliteration,
                "pronunciation": e.pronunciation,
                "short_definition": e.short_definition,
                "long_definition": e.long_definition,
                "part_of_speech": e.part_of_speech,
            }
            for e in entries
        ]
    )


class TestLoader:
    @pytest.fixture
    def sample_words(self) -> list[InterlinearWord]:
        return [
            InterlinearWord(
                verse_id="MAT.1.1",
                word_position=1,
                language=InterlinearLanguage.GREEK,
                source="tagnt",
                original_word="Βίβλος",
                transliteration="Biblos",
                english="[The] book",
                strongs_id="G976",
                strongs_raw="G0976=N-NSF",
                grammar="N-NSF",
                lemma="βίβλος",
                gloss="book",
                semantic_tag="book",
            ),
            InterlinearWord(
                verse_id="MAT.1.1",
                word_position=3,
                language=InterlinearLanguage.GREEK,
                source="tagnt",
                original_word="Ἰησοῦ",
                strongs_id="G2424",
                lemma="Ἰησοῦς",
                gloss="Jesus/Joshua",
                semantic_tag="Jesus»Jesus|Jesus@Mat.1.1",
            ),
        ]

    def test_load_inserts_rows(self, tmp_db, sample_words):
        count = tmp_db.load_interlinear(_to_df(sample_words), source="tagnt")
        assert count == 2

    def test_scoped_delete_preserves_tahot(self, tmp_db, sample_words):
        # Seed a fake TAHOT row
        tmp_db.conn.execute(
            "INSERT INTO interlinear (verse_id, word_position, language, source, "
            "original_word) VALUES ('GEN.1.1', 1, 'hebrew', 'tahot', 'בְּרֵאשִׁית')"
        )
        tmp_db.load_interlinear(_to_df(sample_words), source="tagnt")

        total = tmp_db.conn.execute("SELECT COUNT(*) FROM interlinear").fetchone()
        assert total is not None
        assert total[0] == 3  # 2 TAGNT + 1 TAHOT preserved

    def test_join_with_strongs_lexicon(self, tmp_db, sample_words):
        # Load matching lexicon entries
        lex = [
            StrongsEntry(
                strongs_id="G976",
                language=StrongsLanguage.GREEK,
                original="βίβλος",
                transliteration="biblos",
                short_definition="book",
            ),
            StrongsEntry(
                strongs_id="G2424",
                language=StrongsLanguage.GREEK,
                original="Ἰησοῦς",
                transliteration="Iesous",
                short_definition="Jesus",
            ),
        ]
        tmp_db.load_strongs_entries(_strongs_df(lex))
        tmp_db.load_interlinear(_to_df(sample_words), source="tagnt")

        joined = tmp_db.conn.execute("""
            SELECT il.verse_id, il.original_word, sl.transliteration
            FROM interlinear il
            JOIN strongs_lexicon sl USING (strongs_id)
            ORDER BY il.word_position
        """).fetchall()
        # Both interlinear rows should find a matching lexicon entry
        assert len(joined) == 2
        biblos_row = joined[0]
        assert biblos_row[1] == "Βίβλος"
        assert biblos_row[2] == "biblos"


# ─── Integration ─────────────────────────────────────────────────────────────


@pytest.mark.integration
class TestRealDownload:
    def test_tagnt_john_1_1_has_known_words(self, tmp_path):
        """Sanity: download real TAGNT Mat-Jhn, check Jhn.1.1 has λόγος with G3056."""
        extractor = StepBibleExtractor(cache_dir=tmp_path)
        words = extractor.extract_tagnt(use_cache=False)

        # Keep only Jhn.1.1 words
        j11 = [w for w in words if w.verse_id == "JHN.1.1"]
        assert len(j11) >= 15, f"Expected ~17 words in Jhn.1.1, got {len(j11)}"

        # λόγος (logos) should be tagged G3056
        logoses = [w for w in j11 if w.strongs_id == "G3056"]
        assert len(logoses) >= 2, "Jhn.1.1 has 'λόγος' multiple times"
        assert any("λόγος" in (w.original_word or "") for w in logoses)
