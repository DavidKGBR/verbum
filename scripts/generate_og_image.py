"""Generate Open Graph images for Verbum (default + per-blog-post).

Output: 1200x630 PNG with parchment/gold palette matching the app, served
from frontend/public/og-default.png and frontend/public/og/<slug>.png.

Usage:
    python scripts/generate_og_image.py            # writes og-default.png + all blog ones
    python scripts/generate_og_image.py --only default
    python scripts/generate_og_image.py --slug why-verbum-exists --title "Why Verbum exists"

Pillow is the only dep; if a custom font isn't found we fall back to
Pillow's default which won't be pretty but at least won't crash CI.
"""
from __future__ import annotations

import argparse
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"
OG_DIR = PUBLIC / "og"
OG_DIR.mkdir(parents=True, exist_ok=True)

# Parchment + ink + gold (matching index.css :root vars)
BG_INK = (44, 24, 16)         # var(--color-ink)
BG_PARCHMENT = (245, 240, 232)  # var(--color-parchment)
GOLD = (196, 162, 101)
GOLD_DARK = (139, 115, 85)

# Font candidates ordered by preference. Windows ships Georgia/Constantia by default.
SERIF_CANDIDATES = [
    "C:/Windows/Fonts/georgiab.ttf",  # Georgia Bold
    "C:/Windows/Fonts/CONSTANB.TTF",  # Constantia Bold
    "/usr/share/fonts/truetype/dejavu/DejaVu-Serif-Bold.ttf",
    "/System/Library/Fonts/Times.ttc",
]
SANS_CANDIDATES = [
    "C:/Windows/Fonts/segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVu-Sans.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def load_font(candidates: list[str], size: int) -> ImageFont.ImageFont:
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_card(title: str, subtitle: str | None, output: Path) -> None:
    """Render one 1200x630 OG card."""
    img = Image.new("RGB", (1200, 630), BG_INK)
    draw = ImageDraw.Draw(img)

    # Subtle gold border (10px inset)
    draw.rectangle((40, 40, 1160, 590), outline=GOLD_DARK, width=2)

    # Wordmark "VERBUM" top-left
    wordmark_font = load_font(SERIF_CANDIDATES, 38)
    draw.text((80, 78), "VERBUM", fill=GOLD, font=wordmark_font)

    # Footer URL bottom-left
    url_font = load_font(SANS_CANDIDATES, 22)
    draw.text(
        (80, 540),
        "verbum-app-bible.web.app",
        fill=(180, 165, 130),
        font=url_font,
    )

    # Footer tagline bottom-right
    tagline_font = load_font(SANS_CANDIDATES, 20)
    tagline = "Free open-source Bible study"
    bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tw = bbox[2] - bbox[0]
    draw.text((1120 - tw, 542), tagline, fill=(180, 165, 130), font=tagline_font)

    # Main title (centered area)
    title_font = load_font(SERIF_CANDIDATES, 64)
    title_lines = textwrap.wrap(title, width=22)
    y = 200 if len(title_lines) <= 2 else 170
    for line in title_lines[:4]:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        tw = bbox[2] - bbox[0]
        draw.text(((1200 - tw) // 2, y), line, fill=BG_PARCHMENT, font=title_font)
        y += 78

    # Subtitle (italic-ish via separate font, slightly smaller)
    if subtitle:
        sub_font = load_font(SANS_CANDIDATES, 28)
        sub_lines = textwrap.wrap(subtitle, width=58)
        y += 24
        for line in sub_lines[:2]:
            bbox = draw.textbbox((0, 0), line, font=sub_font)
            tw = bbox[2] - bbox[0]
            draw.text(((1200 - tw) // 2, y), line, fill=(210, 195, 165), font=sub_font)
            y += 36

    img.save(output, "PNG", optimize=True)
    print(f"[og] wrote {output.relative_to(ROOT)}")


# Five posts, hardcoded so the script is self-contained.
POSTS = [
    {
        "slug": "why-verbum-exists",
        "title": "Why Verbum exists",
        "subtitle": "A free Bible study app, built without a paywall.",
    },
    {
        "slug": "sentiment-labels-pt-es",
        "title": "62,209 verses, hand-labelled",
        "subtitle": "How Verbum's emotional landscape was built.",
    },
    {
        "slug": "interlinear-strongs-explained",
        "title": "Reading interlinear in five minutes",
        "subtitle": "Strong's numbers, explained without the language.",
    },
    {
        "slug": "built-with-claude",
        "title": "Building Verbum with Claude",
        "subtitle": "A postmortem of AI-assisted full-stack development.",
    },
    {
        "slug": "twelve-translations",
        "title": "Twelve translations, five languages",
        "subtitle": "How Verbum chose its default Bible texts.",
    },
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Generate one post by slug")
    parser.add_argument("--title", help="Override title (for ad-hoc cards)")
    parser.add_argument("--subtitle", help="Subtitle override")
    parser.add_argument("--only", choices=("default", "posts"), help="Limit scope")
    args = parser.parse_args()

    if args.slug:
        title = args.title or args.slug.replace("-", " ").title()
        subtitle = args.subtitle
        draw_card(title, subtitle, OG_DIR / f"{args.slug}.png")
        return 0

    if args.only != "posts":
        draw_card(
            "Free open-source Bible study",
            "12 translations · 344K cross-references · interlinear Greek/Hebrew",
            PUBLIC / "og-default.png",
        )

    if args.only != "default":
        for post in POSTS:
            draw_card(post["title"], post["subtitle"], OG_DIR / f"{post['slug']}.png")

    return 0


if __name__ == "__main__":
    sys.exit(main())
