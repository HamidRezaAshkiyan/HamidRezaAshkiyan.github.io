# Hamid Reza Ashkiyan — Personal Website & Engineering Blog (v1.1)

A minimalist, zero-dependency personal portfolio and static HTML engineering blog deployed on GitHub Pages (`https://hamidrezaashkiyan.github.io`).

## Features
- **Complete Resume & GitHub Data**: Career timeline (MrBilit, Rahnema College, Cartiba, Yasin Engineering Group), Education, Certifications (ACM-ICPC Asia Region — Sharif University, Rahnema College), Languages, Technical Interests, verified projects, and downloadable PDF resume (`assets/Hamid-Reza-Ashkiyan-Resume.pdf`).
- **Refined Minimalist UI & Animations**: Dark obsidian & light alabaster themes (`localStorage`), scroll progress bar, scroll-reveal choreography, spotlight cards, interactive animated SVG microservices blueprint, monogram avatar, and print-friendly resume stylesheet (`@media print`).
- **Command Palette (`Cmd/Ctrl + K`) & CLI Drawer (`` ` ``)**: Instant keyboard launcher for sections, blog posts, theme toggle, resume download, and one-click contact copy.
- **Minimal Static HTML Blog + Markdown Build Pipeline**:
  - Write articles in plain Markdown under `posts/*.md` with YAML frontmatter.
  - Run `python3 scripts/build_blog.py` (or let `.github/workflows/build-blog.yml` run automatically on push) to generate minimal static HTML articles (`blog/*.html`), `blog/index.html`, `feed.xml` (RSS 2.0), and `sitemap.xml`.
  - Includes sticky desktop Table of Contents, copyable code blocks, and zero-dependency C#/SQL syntax highlighting.
- **SEO & Discovery**: Custom SVG favicon (`assets/favicon.svg`), 1200×630 Open Graph social card (`assets/og-card.png`), `robots.txt`, `sitemap.xml`, `feed.xml`, JSON-LD (`Person` & `BlogPosting`), and terminal-styled `404.html`.

## Adding a New Blog Post
1. Create `posts/your-post-slug.md` with YAML frontmatter (`title`, `date`, `readTime`, `tags`, `summary`).
2. Run `python3 scripts/build_blog.py` (or push to `main` and let the GitHub Action build and commit the static HTML, RSS feed, and sitemap).
