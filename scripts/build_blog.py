#!/usr/bin/env python3
"""
Zero-dependency Markdown -> Minimal Static HTML Blog Builder.
Reads posts/*.md (YAML frontmatter + Markdown) and generates:
  - blog/<slug>.html  (with OG tags, BlogPosting JSON-LD, sticky TOC rail, copyable code blocks)
  - blog/index.html   (archive page with tag filters & live search)
  - feed.xml          (RSS 2.0 feed)
  - sitemap.xml       (XML sitemap for search engines)
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
BLOG_DIR = ROOT / "blog"
SITE_URL = "https://hamidrezaashkiyan.github.io"
AUTHOR = "Hamid Reza Ashkiyan"


def parse_frontmatter(raw: str) -> tuple[dict, str]:
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.DOTALL)
    if not match:
        raise ValueError("Missing YAML frontmatter delimited by ---")
    fm_text, body = match.group(1), match.group(2).strip()
    meta: dict = {}
    for line in fm_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            meta[key] = json.loads(val)
        elif (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            meta[key] = val[1:-1]
        else:
            meta[key] = val
    return meta, body


def format_inline(text: str) -> str:
    tokens: list[str] = []

    def stash(html_frag: str) -> str:
        idx = len(tokens)
        tokens.append(html_frag)
        return f"\x00{idx}\x00"

    # Inline code first so contents are never formatted
    text = re.sub(r"`([^`]+)`", lambda m: stash(f"<code>{html.escape(m.group(1))}</code>"), text)
    # Links [text](url)
    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+|/[^)]+)\)",
        lambda m: stash(f'<a href="{html.escape(m.group(2), quote=True)}" target="_blank" rel="noopener">{html.escape(m.group(1))}</a>'),
        text,
    )
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"\x00(\d+)\x00", lambda m: tokens[int(m.group(1))], text)
    return text


def render_markdown(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Fenced code block
        if stripped.startswith("```"):
            lang = stripped[3:].strip() or "text"
            code_lines: list[str] = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code_html = html.escape("\n".join(code_lines))
            out.append(
                f'<div class="code-block">\n'
                f'  <div class="code-block-header">\n'
                f'    <span>{html.escape(lang)}</span>\n'
                f'    <button class="copy-code-btn" type="button">Copy</button>\n'
                f'  </div>\n'
                f'  <pre><code>{code_html}</code></pre>\n'
                f'</div>'
            )
            continue

        # Headings
        if stripped.startswith("### "):
            out.append(f"<h3>{format_inline(stripped[4:])}</h3>")
            i += 1
            continue
        if stripped.startswith("## "):
            out.append(f"<h2>{format_inline(stripped[3:])}</h2>")
            i += 1
            continue

        # Blockquote
        if stripped.startswith("> "):
            quote_lines: list[str] = []
            while i < n and lines[i].strip().startswith("> "):
                quote_lines.append(lines[i].strip()[2:])
                i += 1
            out.append(f"<blockquote>{format_inline(' '.join(quote_lines))}</blockquote>")
            continue

        # Unordered list
        if stripped.startswith("- "):
            items: list[str] = []
            while i < n and lines[i].strip().startswith("- "):
                items.append(f"  <li>{format_inline(lines[i].strip()[2:])}</li>")
                i += 1
            out.append("<ul>\n" + "\n".join(items) + "\n</ul>")
            continue

        # Ordered list
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while i < n and re.match(r"^\d+\.\s+", lines[i].strip()):
                item_text = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                items.append(f"  <li>{format_inline(item_text)}</li>")
                i += 1
            out.append("<ol>\n" + "\n".join(items) + "\n</ol>")
            continue

        # Paragraph
        para_lines: list[str] = []
        while (
            i < n
            and lines[i].strip()
            and not lines[i].strip().startswith(("```", "## ", "### ", "> ", "- "))
            and not re.match(r"^\d+\.\s+", lines[i].strip())
        ):
            para_lines.append(lines[i].strip())
            i += 1
        out.append(f"<p>{format_inline(' '.join(para_lines))}</p>")

    return "\n\n".join(out)


def render_article_html(post: dict, prev_post: dict | None, next_post: dict | None) -> str:
    title_esc = html.escape(post["title"])
    summary_esc = html.escape(post["summary"])
    url = f'{SITE_URL}/blog/{post["slug"]}.html'

    tags_html = "\n".join(
        f'          <span class="tech-tag{" accent" if idx == 0 else ""}">{html.escape(t)}</span>'
        for idx, t in enumerate(post["tags"])
    )

    ld_json = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post["title"],
            "description": post["summary"],
            "datePublished": post["date"],
            "author": {"@type": "Person", "name": AUTHOR, "url": f"{SITE_URL}/"},
            "url": url,
            "image": f"{SITE_URL}/assets/og-card.png",
            "keywords": ", ".join(post["tags"]),
        },
        indent=2,
    )

    if prev_post:
        prev_link = (
            f'        <a href="{prev_post["slug"]}.html">\n'
            f'          <span class="article-nav-label">&larr; Newer Article</span>\n'
            f'          <span class="article-nav-title">{html.escape(prev_post["title"])}</span>\n'
            f'        </a>'
        )
    else:
        prev_link = (
            '        <a href="index.html">\n'
            '          <span class="article-nav-label">&larr; Archive</span>\n'
            '          <span class="article-nav-title">All Engineering Posts</span>\n'
            '        </a>'
        )

    if next_post:
        next_link = (
            f'        <a href="{next_post["slug"]}.html">\n'
            f'          <span class="article-nav-label">Older Article &rarr;</span>\n'
            f'          <span class="article-nav-title">{html.escape(next_post["title"])}</span>\n'
            f'        </a>'
        )
    else:
        next_link = (
            '        <a href="index.html">\n'
            '          <span class="article-nav-label">Archive &rarr;</span>\n'
            '          <span class="article-nav-title">Back to All Engineering Posts</span>\n'
            '        </a>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_esc} — {AUTHOR}</title>
  <meta name="description" content="{summary_esc}">
  <meta property="og:title" content="{title_esc}">
  <meta property="og:description" content="{summary_esc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE_URL}/assets/og-card.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{SITE_URL}/assets/og-card.png">
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="{AUTHOR} — Engineering Blog" href="../feed.xml">
  <link rel="canonical" href="{url}">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
{ld_json}
  </script>
</head>
<body>
  <div class="scroll-progress" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container header-inner">
      <a href="../index.html" class="logo-link">
        <span class="logo-prompt">hamid@mesh:~$</span>
        <span>cat post.html</span>
      </a>
      <div class="header-actions">
        <button id="btn-cmdk-toggle" class="icon-btn" title="Open Command Palette (Cmd/Ctrl + K)" aria-label="Open Command Palette"><span>⌘K</span></button>
        <button id="btn-theme-toggle" class="icon-btn" title="Toggle theme" aria-label="Toggle theme"></button>
        <a href="index.html" class="icon-btn">&larr; all posts</a>
      </div>
    </div>
  </header>

  <div class="article-layout">
    <main class="article-shell">
      <a href="index.html" class="article-back">&larr; Back to Engineering Blog</a>

      <header class="article-header">
        <div class="blog-meta">
          <span>{html.escape(post["date"])}</span>
          <span>&middot;</span>
          <span>{html.escape(post["readTime"])}</span>
          <span>&middot;</span>
          <span>{AUTHOR}</span>
        </div>
        <h1>{title_esc}</h1>
        <p class="article-lead">{summary_esc}</p>
        <div class="tag-row">
{tags_html}
        </div>
      </header>

      <article class="article-body">
{post["html"]}
      </article>

      <nav class="article-nav" aria-label="Article Navigation">
{prev_link}
{next_link}
      </nav>
    </main>

    <aside id="article-toc" class="article-toc" aria-label="Table of Contents"></aside>
  </div>

  <footer class="site-footer">
    <div class="container footer-inner">
      <span>&copy; 2026 {AUTHOR}</span>
      <div class="footer-links">
        <a href="../index.html">Portfolio</a>
        <a href="index.html">All Articles</a>
        <a href="../feed.xml">RSS</a>
      </div>
    </div>
  </footer>

  <script src="../js/main.js"></script>
</body>
</html>
"""


def render_blog_index(posts: list[dict]) -> str:
    cards: list[str] = []
    for p in posts:
        data_tags = " ".join(t.lower() for t in p["tags"])
        badge_html = (
            f'            <span>&middot;</span>\n            <span style="color:var(--accent-green);">{html.escape(p["badge"])}</span>'
            if p.get("badge")
            else ""
        )
        tags_html = "\n".join(
            f'            <span class="tech-tag{" accent" if idx == 0 and p.get("badge") else ""}">{html.escape(t)}</span>'
            for idx, t in enumerate(p["tags"][:4])
        )
        cards.append(
            f"""      <a href="{p["slug"]}.html" class="blog-card spotlight-card" data-tags="{html.escape(data_tags, quote=True)}">
        <div class="blog-card-main">
          <div class="blog-meta">
            <span>{html.escape(p["date"])}</span>
            <span>&middot;</span>
            <span>{html.escape(p["readTime"])}</span>
{badge_html}
          </div>
          <h2 class="blog-title">{html.escape(p["title"])}</h2>
          <p class="blog-summary">{html.escape(p["summary"])}</p>
          <div class="tag-row">
{tags_html}
          </div>
        </div>
        <span class="blog-arrow" aria-hidden="true">&rarr;</span>
      </a>"""
        )

    cards_joined = "\n\n".join(cards)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Blog — {AUTHOR}</title>
  <meta name="description" content="Backend architecture and distributed systems articles by {AUTHOR} — .NET 10, Clean Architecture, DDD, RabbitMQ Quorum Queues, MassTransit, and SQL Server.">
  <meta property="og:title" content="Engineering Blog — {AUTHOR}">
  <meta property="og:description" content="Minimal static HTML articles on .NET 10 microservices, messaging resilience, and production lessons.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{SITE_URL}/blog/">
  <meta property="og:image" content="{SITE_URL}/assets/og-card.png">
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="{AUTHOR} — Engineering Blog" href="../feed.xml">
  <link rel="canonical" href="{SITE_URL}/blog/">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="scroll-progress" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container header-inner">
      <a href="../index.html" class="logo-link">
        <span class="logo-prompt">hamid@mesh:~$</span>
        <span>cd ~/blog</span>
        <span class="logo-cursor" aria-hidden="true"></span>
      </a>
      <nav class="main-nav" aria-label="Blog Navigation">
        <a href="../index.html#about" class="nav-link">about</a>
        <a href="../index.html#experience" class="nav-link">experience</a>
        <a href="../index.html#projects" class="nav-link">projects</a>
        <a href="index.html" class="nav-link active">blog</a>
      </nav>
      <div class="header-actions">
        <button id="btn-cmdk-toggle" class="icon-btn" title="Open Command Palette (Cmd/Ctrl + K)" aria-label="Open Command Palette"><span>⌘K</span></button>
        <button id="btn-theme-toggle" class="icon-btn" title="Toggle theme" aria-label="Toggle theme"></button>
        <a href="../feed.xml" class="icon-btn">RSS</a>
        <a href="../index.html" class="icon-btn">&larr; home</a>
      </div>
    </div>
  </header>

  <main class="container" style="padding: 3.5rem 1.5rem 5rem;">
    <div class="section-header">
      <div>
        <span class="section-tag">// Engineering Notes Archive</span>
        <h1 class="section-title" style="font-size: clamp(1.8rem, 3vw, 2.3rem);">Backend Architecture Blog</h1>
        <p class="section-desc">Minimal static HTML articles on .NET 10 microservices, messaging resilience, and production lessons.</p>
      </div>
      <a href="../feed.xml" class="btn btn-ghost">Subscribe via RSS &nearr;</a>
    </div>

    <div class="blog-controls">
      <div id="blog-filters" class="filter-bar" role="group" aria-label="Filter articles">
        <button class="filter-btn active" data-tag="all">All ({len(posts)})</button>
        <button class="filter-btn" data-tag=".net">.NET</button>
        <button class="filter-btn" data-tag="rabbitmq">RabbitMQ</button>
        <button class="filter-btn" data-tag="architecture">Architecture</button>
        <button class="filter-btn" data-tag="observability">Observability</button>
      </div>
      <input type="search" id="blog-search" class="blog-search" placeholder="Search articles..." aria-label="Search blog articles">
    </div>

    <div class="blog-list">
{cards_joined}
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <span>&copy; 2026 {AUTHOR} &middot; Engineering Blog</span>
      <div class="footer-links">
        <a href="../index.html">Portfolio</a>
        <a href="../feed.xml">RSS</a>
        <a href="https://github.com/HamidRezaAshkiyan" target="_blank" rel="noopener">GitHub</a>
        <a href="https://www.linkedin.com/in/hamidrezaashkiyan/" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </div>
  </footer>

  <script src="../js/main.js"></script>
</body>
</html>
"""


def render_rss(posts: list[dict]) -> str:
    items_xml: list[str] = []
    for p in posts:
        pub = dt.datetime.strptime(p["date"], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
        url = f'{SITE_URL}/blog/{p["slug"]}.html'
        cats = "\n".join(f"      <category>{html.escape(t)}</category>" for t in p["tags"])
        items_xml.append(
            f"""    <item>
      <title>{html.escape(p["title"])}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <pubDate>{format_datetime(pub)}</pubDate>
      <description>{html.escape(p["summary"])}</description>
{cats}
    </item>"""
        )

    latest = dt.datetime.strptime(posts[0]["date"], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc) if posts else dt.datetime.now(dt.timezone.utc)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{AUTHOR} — Engineering Blog</title>
    <link>{SITE_URL}/blog/</link>
    <description>Backend architecture and distributed systems notes on .NET 10, Clean Architecture, DDD, RabbitMQ Quorum Queues, and MassTransit.</description>
    <language>en-us</language>
    <lastBuildDate>{format_datetime(latest)}</lastBuildDate>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(items_xml)}
  </channel>
</rss>
"""


def render_sitemap(posts: list[dict]) -> str:
    latest_date = posts[0]["date"] if posts else dt.date.today().isoformat()
    urls = [
        f"""  <url>
    <loc>{SITE_URL}/</loc>
    <lastmod>{latest_date}</lastmod>
    <priority>1.0</priority>
  </url>""",
        f"""  <url>
    <loc>{SITE_URL}/blog/</loc>
    <lastmod>{latest_date}</lastmod>
    <priority>0.8</priority>
  </url>""",
    ]
    for p in posts:
        urls.append(
            f"""  <url>
    <loc>{SITE_URL}/blog/{p["slug"]}.html</loc>
    <lastmod>{p["date"]}</lastmod>
    <priority>0.7</priority>
  </url>"""
        )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )


def main() -> None:
    BLOG_DIR.mkdir(parents=True, exist_ok=True)
    posts: list[dict] = []

    for md_path in sorted(POSTS_DIR.glob("*.md")):
        meta, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        posts.append(
            {
                "slug": md_path.stem,
                "title": meta["title"],
                "date": meta["date"],
                "readTime": meta.get("readTime", "5 min read"),
                "tags": meta.get("tags", []),
                "summary": meta.get("summary", ""),
                "badge": meta.get("badge", ""),
                "html": render_markdown(body),
            }
        )

    posts.sort(key=lambda p: p["date"], reverse=True)

    for idx, post in enumerate(posts):
        prev_post = posts[idx - 1] if idx > 0 else None
        next_post = posts[idx + 1] if idx + 1 < len(posts) else None
        out_path = BLOG_DIR / f'{post["slug"]}.html'
        out_path.write_text(render_article_html(post, prev_post, next_post), encoding="utf-8")

    (BLOG_DIR / "index.html").write_text(render_blog_index(posts), encoding="utf-8")
    (ROOT / "feed.xml").write_text(render_rss(posts), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(render_sitemap(posts), encoding="utf-8")
    print(f"Built {len(posts)} HTML blog posts, blog/index.html, feed.xml, and sitemap.xml.")


if __name__ == "__main__":
    main()
