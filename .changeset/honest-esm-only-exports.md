---
'smirks': minor
---

The package stays ESM-only but now says so honestly. The `exports` map used `import` with no `default` and no `require`, so `require('smirks')` failed with `ERR_PACKAGE_PATH_NOT_EXPORTED` and the message `No "exports" main defined` — which reads as a broken package rather than as an ESM one, and which fired before Node's own `require(esm)` support ever got a chance. Switching to a `default` condition means `require('smirks')` now works on Node 20.19 and 22.12 and later, and degrades to a plain ESM error elsewhere. A root `types` field fixes `node10` type resolution, which `attw --profile strict` reported as failing; `./package.json` is exported so `require('smirks/package.json')` and resolver-based tooling work; and `CHANGELOG.md` joins the published tarball, which Changesets had been regenerating into a file `files` excluded. The `attw --pack --profile esm-only` gate is unchanged and is what keeps the ESM-only claim true.
