# No-game-data engineering checks

Run `npm run check:workspace` from wiki-data after installing the sibling workspaces. It stops on the first failure, reports later checks as **NOT RUN**, and never repairs or installs workspace dependencies automatically. It launches npm through the current Node executable and `npm_execpath`, without a command shell or platform-specific npm wrapper.

## Workspace and prerequisites

Use Node.js 24, Git, and the .NET 8 SDK. The SDK builds the project-owned resource bridge; no AnimeStudio installation or game input is required. Keep these exact folder names under one parent so locked `file:../...` dependencies resolve:

| Folder | Repository |
| --- | --- |
| `Inteyvat-Wiki-resource-tools` | `Inteyvat-Wiki/resource-tools` |
| `Inteyvat-Wiki-contracts` | `Inteyvat-Wiki/wiki-contracts` |
| `GenshinData-scripts` | `Inteyvat-Wiki/GenshinData-scripts` |
| `genshin-db` | `Inteyvat-Wiki/genshin-db` |
| `Inteyvat-Wiki-data` | `Inteyvat-Wiki/wiki-data` |
| `Inteyvat-Wiki` | `Inteyvat-Wiki/wiki` |

Initialize Wiki's submodules recursively, including `server`. Run `npm ci` separately in resource-tools, contracts, GenshinData-scripts, genshin-db, wiki-data, then Wiki, in that order. Immediately after installing contracts, run its `npm run build` before installing consumers. All repositories need committed, current lockfiles, including the dependency-free resource-tools package. A missing lockfile is an installation failure, not permission to fall back to `npm install`.

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

The last check intentionally creates an isolated package consumer and installs the tarballs there; it does not install or repair sibling dependencies. Package builds and disposable fixture/cache/report output are expected. No formal exports or real game caches should be generated or updated. `npm run check:workspace -- --skip-packages` explicitly omits only the last integration check, reports it as skipped, and still builds the bridge and contracts required by the earlier checks. CI does not use this option.

Live-source tests (including GDS's excluded misc test), source-dependent validation commands, formal-export checks, generators, and live API checks remain separate opt-in workflows. A green workspace run does **not** establish source-data correctness, complete game coverage, valid formal exports, or a running API. Do not add those commands to the no-game-data entry points.

## CI scope and traceability

The workflow runs on wiki-data pushes, pull requests, and manual dispatch. Initial CI coverage is **Ubuntu 24.04 only**, with Node.js 24 and .NET 8; there is no claim of a passing Windows CI matrix. It checks out the event revision of wiki-data and the other five repositories' default branches, with Wiki's recursively pinned submodules. It records all six actual commit SHAs and recursive Wiki submodule revisions in the job log and summary before installing dependencies. Sibling default branches can change between runs; use the recorded revisions when reproducing a result. Cross-repository coordinated changes must be available on those branches, or maintainers must explicitly select their reviewed revisions before running the workflow.

Only `contents: read` permission is requested. Checkout credentials are not persisted, and there are no publishing, release, or private registry credentials. Checkout and toolchain inputs follow the official [checkout](https://github.com/actions/checkout/tree/v6), [setup-node](https://github.com/actions/setup-node/tree/v6), and [setup-dotnet](https://github.com/actions/setup-dotnet/tree/v5) action definitions. This documents workflow configuration, not evidence that a remote Actions run has passed.
