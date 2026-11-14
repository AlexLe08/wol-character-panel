# 0005: Small PRs to `main`, squash-merged

Status: Accepted · 2026-11-14

## Context

Up to #31 every merged PR but #23 was merged with a merge commit, so
`main` carries each branch's commits and a `Merge pull request #N` commit
for each (from 2026-11-08). Branches are short-lived, one task each, in a
worktree from `scripts/new-worktree.sh`; GitHub didn't delete them on
merge, so the owner pressed "Delete branch" and `scripts/cleanup-merged.sh`
removed the worktree and local branch. There is one maintainer and one
host, and 1.x has had no fix since 2.0 started.

On 2026-11-14 the repository deletes head branches on merge, but still
allows merge commits and rebase merges, and a squash commit takes its
title and message from the commits rather than the PR. The owner changes
those settings by hand.

## Decision

Work lands as small PRs to `main`, squash-merged, one commit per PR. No
long-running feature or integration branches. A `release/1.x` branch, cut
from `v1.0.4`, is created only if a 1.x fix is ever needed. The
repository allows squash merges only, with the PR title and body as the
commit.

**Why:** TODO(Alex)

## Consequences

- `main`'s history is one commit per PR, titled by the PR. The PR title
  is the commit subject, so it's written like one; commits inside a
  branch can stay small for review but don't reach `main`.
- A release tag goes on the `release:` PR's squash commit.
- Branches are deleted on merge by GitHub; the owner no longer presses
  "Delete branch".
- `scripts/cleanup-merged.sh` treats a branch as merged only when it is an
  ancestor of `origin/main` (`git merge-base --is-ancestor`), which a
  squash merge never makes it. Until that changes, it lists no squash-merged
  worktree or branch and they have to be removed by hand.
- Large changes go in a series of small PRs on `main`, each passing the
  checks, as 2.0 did (#24 to #30). `main` can then hold unreleased
  breaking work, as it held 2.0 before its first beta.
- A 1.x fix would be released from `release/1.x`. Once 2.0.0 is `latest`,
  that publish has to leave `latest` on 2.x, which `release.yml` doesn't
  handle yet.
