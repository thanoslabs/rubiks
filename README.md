# rubiks

[![CI](https://github.com/thanoslabs/rubiks/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/thanoslabs/rubiks/actions/workflows/ci.yml)
[![Pages](https://github.com/thanoslabs/rubiks/actions/workflows/pages.yaml/badge.svg?branch=main)](https://thanoslabs.github.io/rubiks/)
[![Release](https://img.shields.io/github/v/release/thanoslabs/rubiks?sort=semver&display_name=tag)](https://github.com/thanoslabs/rubiks/releases/latest)
[![SemVer](https://img.shields.io/badge/semver-2.0.0-blue)](https://semver.org/)
[![License: MIT](https://img.shields.io/github/license/thanoslabs/rubiks)](LICENSE)

A lightweight interactive 3×3 Rubik's cube in the browser. You can scramble it, turn it, and solve it, and it celebrates when you do.

**Play:** https://thanoslabs.github.io/rubiks/ · **Docs:** https://thanoslabs.github.io/rubiks/docs/

- It's a static page in plain JavaScript and CSS 3D, with no frameworks, no CDNs, and no build step.
- Scrambles are WCA-style random 25-move sequences. You can also paste your own in standard notation.
- Your progress (cube, scramble, moves, and timer) is saved in `localStorage` and survives a reload.
- You can self-host it as a small non-root container image.

## Playing

| Action | How |
|---|---|
| Turn a layer | Drag a sticker in the direction you want it to move |
| Rotate the view | Drag the background |
| Keyboard | `U D L R F B`, slices `M E S`, rotations `X Y Z`; hold **Shift** for prime (`'`) |
| Scramble | **Random scramble**, or type one (e.g. `R U R' U' F2`) and **Apply** |

The timer starts on your first turn after a scramble and stops when the cube is solved. Whole-cube rotations don't count as moves. See [docs/usage.md](docs/usage.md) for the full notation.

## Self-hosting

```sh
docker run --rm -p 8080:8080 ghcr.io/thanoslabs/rubiks:latest
```

Then open http://localhost:8080. Images are published for `linux/amd64` and `linux/arm64` on every release, tagged with the bare version (`1.2.3`) and `latest`. The app is static, so you can also serve the `app/` directory with any web server. See [docs/self-hosting.md](docs/self-hosting.md).

## Development

```sh
mise install            # tools pinned in .tool-versions (Node, for tests only)
npm test                # unit tests (node:test, no dependencies)
python3 -m http.server -d app 8000   # http://localhost:8000
docker build -t rubiks . && docker run --rm -p 8080:8080 rubiks
```

See [AGENTS.md](AGENTS.md) for the layout and conventions, and [CONTRIBUTING.md](CONTRIBUTING.md) for the branch and commit style.

## Deployment and releases

- **GitHub Pages:** `.github/workflows/pages.yaml` deploys the app at the site root and the [nebula-md](https://github.com/thanoslabs/nebula-md) build of `docs/` under `/docs/`. It runs on pushes to `main` that touch `app/` or `docs/`, and only for public repos. Settings → Pages → Source must be **GitHub Actions**.
- **Releases:** merging a PR to `main` cuts a SemVer release from its `major`/`minor`/`patch` label (no label means `patch`), then pushes the image to `ghcr.io/thanoslabs/rubiks`. To cut a specific version, run the **Release** workflow manually with an `X.Y.Z` version.
- **Renovate** keeps GitHub Actions, the Dockerfile base image, and `.tool-versions` up to date.
