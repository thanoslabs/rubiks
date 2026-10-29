# AGENTS.md

## Purpose

Lightweight interactive Rubik's cube, served as a static page (no backend, no build step). Bootstrapped from the `thanoslabs` template, so it also carries Renovate, branch protection, CODEOWNERS, and the label-driven release workflow.

## Tech stack

- **Vanilla JavaScript ES modules** under `app/`, loaded directly by the browser — no bundler, no npm runtime dependencies
- **Node.js** (version in `.tool-versions`) only to run unit tests with the built-in `node:test` runner
- **Renovate** for dependency updates (managers: `docker-compose`, `github-actions`, `gomod`)
- **GitHub Actions** for CI (unit tests via `npm test` on PRs and pushes to `main`) and the Renovate, release, and docs workflows
- **[nebula-md](https://github.com/thanoslabs/nebula-md)** for building `docs/` into a static markdown site
- **MIT License**

## Structure

```
.
├── .agents/                  # Agent instructions and skills
├── app/                      # Static site root (serve this directory as-is)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js           # Page wiring: controls, keyboard, turn queue, localStorage
│       ├── view.js           # CSS 3D rendering, turn animation, pointer drag handling (DOM)
│       ├── celebrate.js      # Confetti canvas (DOM)
│       ├── session.js        # Attempt status, move count, timer; persisted as move history (pure)
│       ├── drag.js           # Screen geometry: sticker drag -> layer turn, turn -> CSS rotation (pure)
│       ├── queue.js          # Sequential task queue for turn animations (pure)
│       ├── cube.js           # Cube state (54-facelet string), geometry-derived moves, isSolved
│       ├── notation.js       # Parse/format/invert standard notation (U D L R F B M E S x y z, ' 2)
│       └── scramble.js       # WCA-style 25-move random-move scrambles
├── test/                     # node:test unit tests (*.test.js)
├── .github/
│   ├── CODEOWNERS            # @thanoslabs/reviewers
│   ├── renovate-config.js    # Renovate platform config
│   └── workflows/
│       ├── docs.yaml         # nebula-md docs build + GitHub Pages deploy
│       ├── release.yaml      # Label-driven SemVer release workflow
│       └── renovate.yaml     # Renovate workflow
├── docs/                     # Project documentation (markdown source for the docs site)
├── .tool-versions            # Pinned language/tool versions (asdf/mise)
├── AGENTS.md                 # Operational expectations for humans and AI agents
├── CONTRIBUTING.md
├── LICENSE
├── package.json              # Test script only; no dependencies
├── README.md
├── SECURITY.md
└── renovate.json             # Renovate settings
```

## Commands

| Task | Command |
|---|---|
| Install tools | `mise install` (or `asdf install`) |
| Unit tests | `npm test` |
| Run locally | `python3 -m http.server -d app 8000` → http://localhost:8000 |

No linter or type checker is configured; keep modules dependency-free and document public functions with JSDoc. Keep logic in the pure modules (no DOM access at import time) so it stays unit-testable; `main.js`, `view.js`, and `celebrate.js` are the only DOM modules. Use relative URLs only — the site is served from a subpath on GitHub Pages.

## Conventions

- `.tool-versions` is the single source of truth for language and tool versions. Before building, testing, or running any tooling, check it and use the pinned versions (install via `asdf install` or `mise install`). When adding a new language or tool to the project, pin its version there first — never assume a globally installed version.
- Versioning: project artifacts (releases, tags, packages, images) follow [SemVer](https://semver.org/) as bare `X.Y.Z` — no `v` prefix (`1.4.2`, not `v1.4.2`). Bump MAJOR for breaking changes, MINOR for backwards-compatible features, PATCH for fixes.
- See `AGENTS.md` for full agent workflow, code style, testing, and git/PR guidance.
- Branch protection: never push directly to `main`; all changes via PR with review.
- When adapting this template for a new project, update `renovate.json` managers/schedules and enable the repo in the Renovate GitHub App.
- Project-specific `CLAUDE.md` / `AGENTS.md` content should be filled in once the actual stack is added (`src/`, `tests/`, build commands, etc. are placeholders in `AGENTS.md`, not present here).

## Releases

- All released artifacts (images, binaries, packages) are versioned with [SemVer](https://semver.org/) as bare `X.Y.Z` tags — no `v` prefix.
- **Automatic bumps**: when a PR merges to `main`, the next version is derived from the PR label:
  - `major` — breaking changes
  - `minor` — backwards-compatible features
  - `patch` — fixes
  - No label — defaults to a `patch` bump
- **Manual releases**: a specific version may be cut manually by supplying an explicit `X.Y.Z` version tag when needed (e.g. via a manual workflow dispatch). This bypasses the label-based bump.
- Release automation lives in `.github/workflows/release.yaml`: it computes the next version, tags, and creates the GitHub release. Building and publishing artifacts (images, binaries) is project-specific and left as a TODO stub in the workflow.

## Docs

- Project documentation lives in `docs/` as markdown and is the source for the project's docs site. Do not introduce another static site generator (MkDocs, Docusaurus, etc.) — docs are built with [nebula-md](https://github.com/thanoslabs/nebula-md).
- `.github/workflows/docs.yaml` calls nebula-md's reusable workflow (`thanoslabs/nebula-md/.github/workflows/deploy.yml`) on pushes to `main` that touch `docs/`. Generation happens in CI only — do not commit built HTML.
- Deployment to GitHub Pages runs only when the repository is **public**; private repos skip the job. Public repos must set **Settings → Pages → Source** to **GitHub Actions**.
- Pages are Obsidian-flavoured markdown: YAML frontmatter (`title`, `tags`, `date`), `[[wikilinks]]` between pages, and callouts. `docs/index.md` is the site's landing page.
