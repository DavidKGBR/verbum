import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { ROUTE_META } from "../seoMeta";
import { POSTS } from "../blog/manifest";

/**
 * /blog — index of MDX posts.
 *
 * Manifest is auto-generated at build time by scripts/build-blog-manifest.mjs;
 * this page just renders cards from it. Posts are EN-only in v1; PT/ES are on
 * the post-launch roadmap when there's traction worth translating.
 */
export default function BlogIndexPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <SEO {...ROUTE_META["/blog"]} canonical="/blog" />
      <header className="mb-10">
        <h1 className="page-title text-4xl mb-3">Blog</h1>
        <p className="opacity-70 text-base">
          Notes on Bible study, the methodology behind Verbum&rsquo;s data, and
          what it means to build a free open-source scripture app with an AI as
          pair programmer. Long-form, infrequent, English only for now.
        </p>
      </header>

      <ul className="space-y-8 list-none p-0">
        {POSTS.map((post) => (
          <li
            key={post.slug}
            className="border-b border-[var(--color-gold-dark)]/15 pb-8 last:border-b-0"
          >
            <Link
              to={`/blog/${post.slug}`}
              className="group block no-underline"
            >
              <time
                dateTime={post.date}
                className="text-xs uppercase tracking-wider opacity-50"
              >
                {formatDate(post.date)}
              </time>
              <h2 className="text-2xl font-display font-bold mt-1 mb-2 group-hover:text-[var(--color-gold)] transition">
                {post.title}
              </h2>
              <p className="opacity-75 leading-relaxed">{post.description}</p>
              {post.tags && post.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function formatDate(iso: string): string {
  // Render as "April 25, 2026" in EN — blog is EN-only.
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
