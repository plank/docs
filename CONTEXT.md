# Plank Docs

The infrastructure that turns documentation written in Plank's open-source Laravel packages into one public, Plank-branded docs site. No docs are written in this repo.

## Language

**Package**:
One of Plank's open-source Laravel packages (e.g. snapshots, publisher), living in its own repository under the `plank` GitHub org.
_Avoid_: Library, repo, project

**Package Docs**:
The documentation for one Package, written and versioned in that Package's own repository.
_Avoid_: README, content

**Major Line**:
One major version of a Package (e.g. `13.x`), maintained on its own branch. For most Plank Packages it tracks the matching Laravel major.
_Avoid_: Branch, release, version

**Docs Version**:
The Package Docs for one Major Line, as of that line's latest release. A Package's history on the Docs Site is its set of Docs Versions.
_Avoid_: Snapshot, release docs

**Docs Site**:
The single public site that hosts every Package's Package Docs, each under its own path (e.g. `packages.plank.co/snapshots`).
_Avoid_: Docs portal, per-package site

**Docs Tooling**:
The shared build, theme and deploy that turns a Package's Package Docs into Docs Versions on the Docs Site. It lives in this repo, and every Package uses the same one.
_Avoid_: Docs Build, Docs Theme, shared build tooling
