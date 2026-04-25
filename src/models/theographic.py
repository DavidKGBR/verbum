"""
🌍 Theographic Data Models
Pydantic models for biblical people, places, events, and family relations
from the theographic-bible-metadata repository.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class BiblicalPerson(BaseModel):
    """A person mentioned in the Bible."""

    person_id: str = Field(..., description="Theographic record ID")
    slug: str = Field(..., description="URL-safe lookup key (e.g., 'moses_1')")
    name: str = Field(..., description="Display name")
    gender: str | None = None
    birth_year: int | None = Field(None, description="Estimated birth year (astronomical)")
    death_year: int | None = Field(None, description="Estimated death year (astronomical)")
    description: str | None = None
    also_called: str | None = Field(None, description="JSON array of alternate names")
    tribe: str | None = None
    occupation: str | None = None
    books_mentioned: str | None = Field(None, description="JSON array of book_ids")
    verse_count: int = 0
    min_year: int | None = None
    max_year: int | None = None


class BiblicalPlace(BaseModel):
    """A geographical location mentioned in the Bible."""

    place_id: str = Field(..., description="Theographic record ID")
    slug: str = Field(..., description="URL-safe lookup key")
    name: str = Field(..., description="KJV display name")
    latitude: float | None = None
    longitude: float | None = None
    geo_confidence: float | None = Field(None, ge=0, le=1)
    place_type: str | None = Field(None, description="city, region, mountain, river, etc.")
    description: str | None = None
    also_called: str | None = Field(None, description="JSON array of alternate names")
    verse_count: int = 0


class BiblicalEvent(BaseModel):
    """A discrete event recorded in the Bible."""

    event_id: str = Field(..., description="Theographic record ID")
    title: str
    description: str | None = None
    start_year: int | None = Field(None, description="Estimated year (astronomical)")
    sort_key: float | None = Field(None, description="Theographic sort order")
    duration: str | None = Field(None, description="Duration string (e.g., '7D')")
    era: str | None = Field(None, description="Patriarchs, Exodus, Monarchy, Exile, NT")
    participants: str | None = Field(None, description="JSON array of person_ids")
    locations: str | None = Field(None, description="JSON array of place_ids")
    verse_refs: str | None = Field(None, description="JSON array of verse_ids")


class FamilyRelation(BaseModel):
    """A family relationship between two biblical people."""

    person_id: str
    related_person_id: str
    relation_type: str = Field(
        ..., description="father, mother, spouse, sibling, child, half_sibling"
    )
