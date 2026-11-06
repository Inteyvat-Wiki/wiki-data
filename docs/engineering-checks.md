# No-game-data engineering checks

Run `npm run check:workspace -- --config tmp/package-sources.json` from wiki-data after installing the configured repositories. It stops on the first failure, reports later checks as **NOT RUN**, and never repairs or installs workspace dependencies automatically. It launches npm through the current Node executable and `npm_execpath`, without a command shell or platform-specific npm wrapper.

## Workspace and prerequisites

Use Node.js 24, Git, and the .NET 8 SDK for maintainer checks. The SDK builds the project-owned resource bridge; no AnimeStudio installation or game input is required. Runtime consumers receive the compiled bridge and contracts in their tarballs and do not need the SDK or an install-time build. A .NET runtime is still required to execute the bridge.

Repository locations are explicit and need not share a parent or particular folder names:

| Package/config key | Repository |
| --- | --- |
| `@inteyvat-wiki/resource-tools` | `Inteyvat-Wiki/resource-tools` |
| `@inteyvat-wiki/wiki-contracts` | `Inteyvat-Wiki/wiki-contracts` |
| `@inteyvat-wiki/genshin-data-scripts` | `Inteyvat-Wiki/GenshinData-scripts` |
| `@inteyvat-wiki/genshin-db` | `Inteyvat-Wiki/genshin-db` |
| wiki-data runner location | `Inteyvat-Wiki/wiki-data` |
| `inteyvat-wiki` | `Inteyvat-Wiki/wiki` |

Initialize Wiki's submodules recursively, including `server`. First install maintainer dependencies in resource-tools and contracts using their ordinary `npm ci`; these do not depend on unpublished packages. Then follow the local packaging workflow below to install other repositories. Keep all lockfiles current, including dependency-free resource-tools. A missing lockfile is an installation failure, not permission to fall back to an unreviewed `npm install`.

## Local packages before publication

The four scoped packages are version `0.1.0` and are **not published**. GDS/db retain `private: true` and their publication protections. Ordinary online `npm ci` cannot fetch their unpublished versions; use the maintained helper until publication is separately authorized. It never publishes, creates source-repository commits, or changes dependency manifests to file links, overrides, or workspaces.

Put maintainer source paths in an untracked file, for example `tmp/package-sources.json` (edit these example paths for your checkouts):

```json
{
  "packaging": {
    "repositories": {
      "@inteyvat-wiki/resource-tools": "/work/tools/resource-tools",
      "@inteyvat-wiki/wiki-contracts": "/work/libraries/contracts",
      "@inteyvat-wiki/genshin-data-scripts": "/work/extractors/gds",
      "@inteyvat-wiki/genshin-db": "/work/queries/db",
      "inteyvat-wiki": "/work/apps/wiki"
    }
  }
}
```

Windows paths may use `D:/my-checkouts/...`. Relative paths resolve against the JSON file's directory. This maintainer-only file is separate from runtime `wiki-data.config.json`; do not add packaging keys to the runtime config. Precedence is repeated `--source NAME=PATH` options, then `--config FILE` (or `INTEYVAT_PACKAGE_CONFIG`), then installed npm package discovery. Discovery can find source checkouts through an existing installation, but a published dist-only package is not a substitute for a maintainer source checkout. `check:workspace` accepts `--wiki PATH` for Wiki's location.

From wiki-data, pack the four repositories once:

```sh
npm run packages:local -- pack --config tmp/package-sources.json
```

This runs resource-tools/contracts prepack builds and checks the tarball contents for raw inputs, caches, foreign binaries and missing runtime files. It prints an `archives` directory under `tmp/package-integration-*/`; retain that directory. No tarballs need to be manually moved. Subsequent commands reuse it without rebuilding the bridge:

```sh
npm run packages:local -- lock --consumer /path/to/wiki-data --archives "<archives>"
npm run packages:local -- install --consumer /path/to/wiki-data --archives "<archives>"
npm run packages:local -- verify --consumer /path/to/wiki-data --archives "<archives>"
npm run check:packages -- --archives "<archives>"
```

Replace `<archives>` with the returned directory. `lock`, `install` and `verify` accept repeated `--consumer PATH` for GDS, db, resource-tools, contracts, wiki-data and/or Wiki, or default to wiki-data. `lock` changes only selected lockfiles; it retains third-party version pins and refreshes owned scoped entries, even when an unpublished `0.1.0` archive is rebuilt with different contents. It refuses a concurrent manifest edit. `install` uses `npm ci`: it replaces the target's installed dependencies, so first preserve any intentional edits inside `node_modules`. npm removes old package links without deleting their sibling source targets. `verify` installs isolated copies instead and leaves the selected repository's installation unchanged.

The temporary registry binds only to `127.0.0.1`, serves the four packed artifacts, and proxies read-only standard-registry requests to npm. It rejects publishing/mutations, never forwards authentication, and shuts down when the command finishes. Caches are private to each run. All consumer lifecycle hooks are disabled; Wiki's own `nuxt prepare` can be run separately by its normal check commands. Standard dependencies still need network access: this is not an offline mirror.

Production manifests always retain exact normal npm versions. Saved lockfiles use canonical `https://registry.npmjs.org/` tarball URLs with the actual packed integrity; no localhost ports, `file:` dependencies, link entries or overrides are saved. Only URLs belonging to this run's registry are normalized; unrelated registry URLs and integrity hashes are preserved. A changed archive fails the install preflight before `npm ci` touches `node_modules`; regenerate the locks with `lock` first. After the publication/license gate is resolved, any metadata or code changes require a fresh pack and lock regeneration against the exact final artifacts. The canonical locks can then use ordinary npm after those matching artifacts are published.

`npm run test:packaging` covers config/path mapping, private package acceptance, stale-integrity rejection, same-version repack/lock refresh, URL normalization and the read-only registry. `check:packages` installs only db and contracts as entry points, requiring npm to resolve GDS and resource-tools transitively. It then reinstalls using a second empty cache and a portable lock, checks that installed package directories are not links, tests CJS/ESM and declared type exports, browser-only contracts, CLI help, the packed bridge without SDK/build commands, and a tiny synthetic extraction/cache/query fixture. The JS-only cache/storage fixture helper is runtime-tested but has no declaration contract. Reports and fixtures remain below `tmp/package-integration-*/` for inspection; they contain no real game data.

The coordinated manifests now provide the following scripts; the runner checks for them before starting any build or test. Keep those script entries and their lockfiles with the runner when applying the coordinated changes across repositories.

## Selected checks

| Order | Workspace | Command and scope |
| --- | --- | --- |
| 1 | contracts | `npm test`: build CommonJS, ESM, and declarations; synthetic contract tests |
| 2 | contracts | `npm run test:types`: type-consumer checks |
| 3 | resource-tools | `npm run build:helper`: compile the project-owned .NET bridge |
| 4 | resource-tools | `npm test`: synthetic resource fixtures |
| 5 | GenshinData-scripts | `npm run test:unit`: fixture discovery, excluding only live-source `extract/misc/misc.test.js` |
| 6 | genshin-db | `npm run test:unit`: synthetic `tests/*.test.js` |
| 7 | wiki-data | `npm run check`: types and synthetic `scripts/*.test.*` |
| 8 | Wiki | `npm run check`: app/server/shared types and focused no-formal-data checks |
| 9 | wiki-data | `npm run check:packages`: four real tarballs, isolated consumer, synthetic prepare/cache/query integration |

The last check intentionally creates isolated package consumers and resolves real tarballs through the local registry; it does not install or repair other repositories' dependencies. Package builds and disposable fixture/cache/report output are expected. No formal exports or real game caches should be generated or updated. `npm run check:workspace -- --config tmp/package-sources.json --skip-packages` explicitly omits only the last integration check, reports it as skipped, and still builds the bridge and contracts required by the earlier checks.

Live-source tests (including GDS's excluded misc test), source-dependent validation commands, formal-export checks, generators, and live API checks remain separate opt-in workflows. A green workspace run does **not** establish source-data correctness, complete game coverage, valid formal exports, or a running API. Do not add those commands to the no-game-data entry points.

## Remote CI status

Remote CI workflows have been removed. Pushes and pull requests no longer trigger workspace checks; run the local commands above explicitly when needed. Local build/test scripts and `npm ci` remain available. Reintroducing remote automation requires separate approval and a dependency bootstrap compatible with the unpublished scoped packages.

When coordinating repositories, record their actual revisions and Wiki's recursive submodule revisions. Repository default branches can change between runs; explicit source paths alone do not pin revisions. No publishing, release, or registry credentials are required by this local workflow.
