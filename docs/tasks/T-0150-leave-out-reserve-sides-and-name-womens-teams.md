---
id: T-0150
title: Leave out reserve sides and name women's teams apart from men's
component: data
kind: fix
agent: data-implementer
paths:
  - data/pipeline/src/soccer_cards_data/normalise.py
  - data/pipeline/src/soccer_cards_data/wikidata.py
  - data/pipeline/src/soccer_cards_data/build.py
  - data/pipeline/tests/test_normalise.py
  - data/pipeline/tests/test_wikidata.py
  - data/pipeline/tests/test_build.py
  - data/pipeline/tests/test_published_api.py
  - data/pipeline/tests/fixtures/**
  - data/pipeline/ids.toml
  - data/api/v1/**
dependencies: []
max_changed_lines: 300
status: ready
---

## Goal

T-0142's review found two problems in the published club history:

- **F1.** Reserve and academy sides pass the youth rule and appear as
  clubs and spells: FC Barcelona Atlètic (Messi's 2004 to 2005 spell), the
  Australian Institute of Sport football program and the New South Wales
  Institute of Sport. ADR 0009 D2 leaves reserve and academy sides out.
- **F2.** Five clubs appear twice under one name: Sydney FC, Perth Glory
  FC, Melbourne City FC, Western Sydney Wanderers FC and Piteå IF. The lead
  checked on Wikidata on 2026-11-22: each second item is the club's women's
  side, with competition class (P2094) Q606060, "women's association
  football". For example, Q15649515 is "Sydney FC, women's soccer club".
  A child can't tell them apart today.

## Context

- `.sdlc/reviews/T-0142.reviewer.json` in the main checkout.
- `_YOUTH` in `normalise.py` and the club spells in `wikidata.py`.
- ADR 0005 D2: an id is never changed or reused. The `-2` slugs stay.
- ADR 0009 D2 and D7.

## Acceptance criteria

- Reserve and academy sides are left out of `careerSpells` and
  `clubs.json`. The rule catches "Atlètic" and "B" sides of a club, and
  sports institutes and academies, with a test for each named club above.
  A club the rule removes is listed in the run's report.
- The pipeline reads P2094 for each club. A club whose P2094 is Q606060 is
  a women's side.
- When a women's side would share its display name with another club, its
  display name gains " Women", as in "Sydney FC Women". A name that already
  says so, such as "Arsenal W.F.C.", is left as it is.
- No two published clubs share a display name. A test on the committed
  files checks it.
- Slugs don't change. Every existing entry in `ids.toml` stays.
- T-0142 review F3: an unparseable end date is reported as unparseable, not
  as ending before it starts.
- `data/api/v1` is rebuilt by `scdata build` only. The report lists the
  request count, the clubs and spells removed, and the clubs renamed.
- `make check COMPONENT=data` passes.

## Edge cases

- A women's side with no men's side in the set keeps its own label.
- A club whose label merely contains "Institute" but is a senior side
  (check the real list in the report before writing the rule wide).
- A player whose only club spells are removed: no `careerSpells` field, as
  for a player with none.

## Tests

- `test_normalise.py` and `test_wikidata.py` with saved responses for each
  rule, `test_build.py` for the rename, `test_published_api.py` for unique
  display names.

## Out of scope

- Changing any slug, the schema, club colours and the site.
