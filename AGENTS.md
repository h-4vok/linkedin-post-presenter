# Agent Instructions

For substantive work in this repository, first understand that `linkedin-post-presenter` is a standalone SPA for uploading and reviewing enriched LinkedIn JSON dumps produced by `linkedin-post-gatherer`.

## Local Skills

- `product-manager`: use `.agents/skills/product-manager/SKILL.md` when defining or refining product requirements, GitHub Issues, backlog items, user flows, acceptance criteria, and business edge cases. This role defines what the presenter must achieve and why.
- `tech-lead`: use `.agents/skills/tech-lead/SKILL.md` when translating a refined requirement into an exact read-only technical plan. This role never implements code.

## Project Boundaries

- Presenter owns loading, validating enough to browse, filtering, searching, displaying, copying, and opening enriched post data.
- Gatherer owns collecting LinkedIn data and generating the enriched JSON input.
- Do not create a separate cross-repo contract document unless the user explicitly asks for it.
- If JSON input behavior changes, check both this repo and `../linkedin-post-gatherer` when available.

## Validation Expectations

- For implementation work outside the `tech-lead` skill, prefer the existing npm scripts in `package.json`.
- For UI changes, verify the visible states that changed: initial upload, invalid JSON error, empty results, filtered results, search, and post card actions as applicable.
- Do not revert unrelated user changes.
