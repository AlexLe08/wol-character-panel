# Security

## Supported versions

Fixes go into the latest 1.x release. Older versions don't get backports;
upgrade within the major (`^1`) to pick them up.

## Reporting a vulnerability

Report it privately through
[GitHub's vulnerability reporting](https://github.com/AlexLe08/wol-character-panel/security/advisories/new),
not in a public issue. Include the package version, a config or code that
shows the problem, and what an attacker gains.

This is maintained by one person: expect a first reply within a week. A
confirmed issue is fixed in a patch release, and the advisory is published
once the fix is on npm.

## What counts

The panel renders a config that a host may not fully trust (an admin
editor, a CMS). In scope:

- A config that `parseConfig` accepts, or that passes the JSON Schema, and
  that makes the panel run script, inject markup, or link anywhere the
  schema doesn't allow: an anchor or query on the same page, a path on the
  same site (one leading `/`), or an `http(s)` URL.
- A published file (in `dist/`, the CSS or the JSON Schema) that differs
  from what the release workflow built, or a provenance attestation that
  doesn't match this repository.

Out of scope: problems in a host's own code, and vulnerabilities in
`react` or `zod` themselves (report those upstream). Dev dependencies
don't ship in the package; Dependabot keeps them current.
