# 0008: Rulesets on `main` and release tags

Status: Accepted · 2026-11-19

## Context

Since the move to this repository
([0001](0001-own-package-and-repository.md)), `main` had no ruleset or branch
protection. CLAUDE.md recorded that as the owner's choice, and the
workflow (branch off `main`, PR, CI green, owner merges, never push to
`main`) held by convention only. On 2026-11-19 the owner found `main`
unprotected after expecting it to be protected. The repository already
allowed squash merges only and deleted head branches on merge ([0005](0005-small-prs-squash-only.md)).

Claude Code sessions push with the owner's GitHub credentials, so GitHub
can't tell them from the owner: a rule that lets an admin push directly
would not stop a session pushing to `main` either. `release.yml`
publishes when a `v*` tag is pushed, and `pages.yml` builds the demos
from `refs/tags/v…`. The `browser` job's Chromium install has failed on
outages outside the repository (four times on 2026-11-11, PR #22).

The options were classic branch protection or repository rulesets, both
free on a public repository. Rulesets also cover tags, and their bypass
can be limited to pull requests.

## Decision

Two repository rulesets, created 2026-11-19:

- `main` (the default branch): a pull request is required, with 0
  approvals and squash as the only merge method; the checks `check`,
  `compat (Node 22.12)`, `compat (oldest peers)` and `browser` (GitHub
  Actions) must pass, without the branch having to be up to date; linear
  history; no force pushes or deletion. Repository admins may bypass for
  pull requests only.
- `release tags` (`refs/tags/v*`): no updates, deletions or force pushes,
  with no bypass.

**Why:**

After importing the code out of the portfolio sight, I was under the asumption the repo was already set with protection, when it wasn't. It was through good consistent practice that I continued to create features without breaking those unset rules I've been following across projects, but now there as some assurance with rulesets fully in place. There is still the risk of Claude doing unintended things on my behalf but it will be under close watch and personally reviewing PRs and code changes is still my unchanging task regardless of any rules set.

## Consequences

- Nobody, the owner and Claude sessions included, can push to `main`
  directly; every change reaches it as a squash-merged PR.
- 0 approvals, because GitHub doesn't let an author approve their own PR.
  Review stays with the `reviewer` agent and the owner's read of the diff.
- When CI fails for a reason outside the repository (an apt outage, say),
  the owner can merge past the checks with the bypass. It is still a PR
  and one squash commit.
- Merging, and merging past the checks with the bypass, isn't limited to
  the owner either: a session with the owner's credentials could do both,
  so only the owner merging stays a convention.
- Branches needn't be up to date with `main` before merging. Two PRs that
  pass apart could fail together; CI on the push to `main` shows that
  after the merge. Dependabot PRs don't need updating after each merge.
- Renaming, adding or removing a CI job means updating the ruleset too,
  or PRs wait on a check that never reports.
- A pushed `v*` tag can't be moved or deleted. A tag on the wrong commit
  is fixed with the next version (patch, or `beta.N` for a prerelease),
  or by the owner disabling the ruleset in Settings for that one change.
- Creating tags isn't restricted: a restriction with an admin bypass
  couldn't tell a Claude session from the owner, so only the owner
  tagging stays a convention.
- The rulesets live in GitHub's settings, not in the repository. This
  record, Settings → Rules → Rulesets, or
  `gh api repos/AlexLe08/wol-character-panel/rulesets` show what is set.
