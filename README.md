# Hamid Reza Ashkiyan — Personal Website & Engineering Blog (v1.0)

A minimalist, zero-dependency personal portfolio and static HTML engineering blog built for GitHub Pages (`https://hamidrezaashkiyan.github.io`).

## What's Included in v1.0
- **Complete Resume & GitHub Data**: Full career timeline (MrBilit, Rahnema College, Cartiba, Yasin Engineering Group), Education (University of Sheikh Bahaei), Certifications (ACM-ICPC Asia Region — Sharif University, Rahnema College), Languages, Technical Interests, and verified open-source projects (`ModularMonolith`, `Hafez`, `aegis`, `ophiuchi-rs`, `folio`, `PadDisplay`, `PersianKeyboardRedefined`).
- **Downloadable Resume PDF**: Bundled at `assets/Hamid-Reza-Ashkiyan-Resume.pdf`.
- **Minimal Static HTML Blog (`/blog/*.html`)**: Native static HTML articles (no Jekyll or client-side Markdown parser needed — works identically on GitHub Pages and local `file://`), complete with archive filtering, search, reading progress bar, and one-click code copy.
- **Refined Minimalist UI & Animations**: Dark obsidian & clean light theme toggle (`localStorage`), scroll-reveal choreography, pointer spotlight cards, interactive animated SVG microservices blueprint with node inspector, and a responsive mobile drawer.
- **Interactive CLI Drawer**: Press `` ` `` (backtick) or click `>_ cli` to run `whoami`, `experience`, `education`, `certs`, `skills`, `projects`, `posts`, `arch`, `contact`, and `theme` with arrow-key history and Tab autocomplete.

## Local Preview
Open `index.html` directly in any browser, or run:

```bash
python3 -m http.server 8080
```

## Adding a New Blog Post
1. Copy any existing minimal HTML article in `blog/` (e.g., `blog/migrating-15-microservices-to-dotnet-8.html`).
2. Update its `<title>`, `<meta>`, heading, content, and prev/next links.
3. Add a matching card entry in `index.html` (`#blog`) and `blog/index.html`.
