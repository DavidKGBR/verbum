import { Suspense, lazy, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO, { SITE_URL } from "../components/SEO";
import { POSTS, type BlogPost } from "../blog/manifest";

/**
 * /blog/:slug — render a single MDX post.
 *
 * MDX modules are imported lazily so each post is its own bundle chunk;
 * a 404 slug renders the NotFoundPage via <Navigate to="/404">.
 */

// Pre-build a map: slug → lazy MDX component. Keyed in src/blog/posts/<file>.mdx.
const POST_MODULES = import.meta.glob("../blog/posts/*.mdx");

function loaderForFile(file: string) {
  // Vite glob keys use the './...' style we resolve back from "../blog/posts/<file>.mdx".
  const key = `../blog/posts/${file}.mdx`;
  const loader = POST_MODULES[key];
  if (!loader) return null;
  return lazy(
    loader as () => Promise<{ default: React.ComponentType<unknown> }>,
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = useMemo<BlogPost | undefined>(
    () => POSTS.find((p) => p.slug === slug),
    [slug],
  );

  if (!post) return <Navigate to="/404" replace />;

  const Post = loaderForFile(post.file);
  if (!Post) return <Navigate to="/404" replace />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    image: `${SITE_URL}${post.ogImage}`,
    author: { "@type": "Person", name: "David Lourenço" },
    publisher: {
      "@type": "Organization",
      name: "Verbum",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/verbum-icon.svg`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    inLanguage: "en",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <article className="max-w-2xl mx-auto px-4 py-10">
      <SEO
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        ogImage={post.ogImage}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />

      <nav className="mb-6 text-sm">
        <Link to="/blog" className="opacity-60 hover:opacity-100 transition">
          ← All posts
        </Link>
      </nav>

      <header className="mb-8">
        <time
          dateTime={post.date}
          className="text-xs uppercase tracking-wider opacity-50"
        >
          {formatDate(post.date)}
        </time>
      </header>

      <div className="prose prose-stone prose-base max-w-none prose-headings:font-display prose-headings:text-[var(--color-ink)] prose-a:text-[var(--color-gold-dark)] prose-a:no-underline hover:prose-a:underline">
        <Suspense fallback={<p className="opacity-50">Loading post…</p>}>
          <Post />
        </Suspense>
      </div>

      <footer className="mt-12 pt-6 border-t border-[var(--color-gold-dark)]/15 text-sm opacity-60">
        <p>
          Found a typo or want to suggest a topic?{" "}
          <a
            href="https://github.com/DavidKGBR/verbum/issues/new"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Open an issue on GitHub
          </a>
          .
        </p>
      </footer>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
