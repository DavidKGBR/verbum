/**
 * SEO — single source of truth for per-page meta tags.
 *
 * Wraps react-helmet-async with project defaults (canonical site, OG image,
 * org). Pages pass title/description/jsonLd; everything else falls back to
 * sensible defaults set on Home.
 *
 * IMPORTANT: <SEO> must be a child of <HelmetProvider> (mounted in main.tsx).
 */
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://verbum-app-bible.web.app";
const DEFAULT_TITLE = "Verbum — Free Open-Source Bible Study App";
const DEFAULT_DESCRIPTION =
  "Free open-source Bible study app — 12 translations, 344K cross-references, " +
  "interlinear Greek/Hebrew, AI-assisted analysis. No paywall, no ads.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface SEOProps {
  title?: string;
  description?: string;
  /** Path-relative URL like "/about". The site origin is prefixed automatically. */
  canonical?: string;
  /** Absolute or root-relative path. Defaults to /og-default.png. */
  ogImage?: string;
  /** When true, emits robots="noindex,nofollow". */
  noindex?: boolean;
  /** Optional JSON-LD object (or array). Stringified & inlined as a script tag. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLd?: object | object[];
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  noindex,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} — Verbum` : DEFAULT_TITLE;
  const desc = description ?? DEFAULT_DESCRIPTION;
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${SITE_URL}${canonical}`
    : SITE_URL;
  const og = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${SITE_URL}${ogImage}`
    : DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Verbum" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={og} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={og} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}

export { SITE_URL };
