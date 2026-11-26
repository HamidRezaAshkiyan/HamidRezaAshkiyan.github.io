# AGENTS.md — Personal Website & Engineering Blog

## Overview
Minimalist, zero-dependency personal portfolio, interactive printable resume, and static HTML engineering blog for **Hamid Reza Ashkiyan**, deployed on GitHub Pages (`https://hamidrezaashkiyan.github.io`). Includes a custom Python Markdown-to-HTML build pipeline that generates blog pages, an archive index, an RSS 2.0 feed, and an XML sitemap.

## Tech Stack & Requirements
- **Frontend:** Vanilla HTML5, CSS3 (`css/style.css` with dark/light themes + `@media print`), and Vanilla JavaScript (`js/main.js`) — zero npm packages or frontend frameworks
- **Blog Builder:** Python 3.12+ standard library only (`scripts/build_blog.py` — `re`, `html`, `json`, `datetime`, `email.utils`, `pathlib`)
- **Hosting & CI:** GitHub Pages + GitHub Actions (`.github/workflows/build-blog.yml`)

## Repository Structure
```text
.
├── index.html                  # Main portfolio landing page (bio, timeline, SVG blueprint, projects, JSON-LD)
├── resume.html                 # Printable resume page (@media print stylesheet)
├── 404.html                    # Terminal-styled 404 error page
├── css/style.css               # Shared styles (dark obsidian & light alabaster themes, animations, print CSS)
├── js/main.js                  # Theme toggle (localStorage), Cmd/Ctrl+K command palette, CLI drawer (`), TOC, syntax highlighting
├── assets/                     # favicon.svg, og-card.svg, og-card.png (1200x630 Open Graph image)
├── posts/                      # Source Markdown articles with YAML frontmatter (*.md)
├── blog/                       # Generated static HTML articles (<slug>.html) and archive (index.html)
├── feed.xml                    # Generated RSS 2.0 feed (also consumed by GitHub profile repo)
├── sitemap.xml                 # Generated XML sitemap
├── robots.txt                  # Search engine crawl rules
├── scripts/
│   └── build_blog.py           # Zero-dependency Markdown -> HTML, RSS 2.0, and sitemap generator
└── .github/workflows/
    └── build-blog.yml          # Auto-rebuilds and commits blog/, feed.xml, sitemap.xml on push to main
```

## Architecture & Key Flows
- **Static Portfolio & Resume:** `index.html`, `resume.html`, `404.html`, `css/style.css`, and `js/main.js` are served directly by GitHub Pages with no bundling step.
- **Blog Build Pipeline (`scripts/build_blog.py`):**
  1. Reads every `posts/*.md` file and parses YAML frontmatter (`title`, `date`, `readTime`, `tags`, `summary`).
  2. Renders Markdown (headings, fenced code blocks with copy buttons, blockquotes, lists, inline code/links/bold/italic) into `blog/<slug>.html` with Open Graph meta tags, `BlogPosting` JSON-LD, and sticky TOC support.
  3. Generates `blog/index.html` (with tag filtering and live search), `feed.xml` (RSS 2.0), and `sitemap.xml`.
- **CI Automation (`.github/workflows/build-blog.yml`):** Triggers on pushes to `main` touching `posts/**` or `scripts/build_blog.py` (or `workflow_dispatch`), runs `python3 scripts/build_blog.py`, and commits updated `blog/`, `feed.xml`, and `sitemap.xml`.

## Development & Commands
```bash
# Rebuild blog/*.html, blog/index.html, feed.xml, and sitemap.xml from posts/*.md
python3 scripts/build_blog.py

# Preview the static site locally
python3 -m http.server 8000
# Open http://localhost:8000/
```

## Configuration & Environment
No environment variables or build secrets are required. Site metadata (`SITE_URL`, `AUTHOR`) is defined at the top of `scripts/build_blog.py`. GitHub Actions uses the default `GITHUB_TOKEN` with `permissions: contents: write`.

## Conventions & Gotchas
- **Never Hand-Edit Generated Outputs:** `blog/*.html`, `blog/index.html`, `feed.xml`, and `sitemap.xml` are overwritten by `scripts/build_blog.py`. Always edit `posts/*.md` or `scripts/build_blog.py` and re-run the builder.
- **Strict Frontmatter Format:** `parse_frontmatter()` in `scripts/build_blog.py` uses a lightweight line-by-line parser (not PyYAML). Keep frontmatter keys single-line and format `tags` as a valid JSON array (e.g., `tags: [".NET", "RabbitMQ"]`).
- **Zero-Dependency Constraint:** Keep both the frontend (HTML/CSS/JS) and `scripts/build_blog.py` free of third-party packages.
- **Downstream RSS Consumer:** The `HamidRezaAshkiyan` GitHub profile repo fetches `feed.xml` daily — do not break RSS 2.0 `<channel>/<item>` fields (`title`, `link`, `pubDate`).
