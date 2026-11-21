# Test Gap Map

Intersect changed executable line numbers with supplied coverage to find untested changes.

**Status:** implemented browser-local research prototype. Automated tests can be reproduced with the command below. The existing Pages site previously passed smoke checks. The instrumentation-aware update is locally tested; its latest deployment and browser behavior have not been verified.

## Website

Live website: https://royalpuskar.github.io/test-gap-map/

## Problem and approach

Reviewers need to distinguish changed lines measured as missed from lines with no instrumentation evidence. This tool partitions supplied changed lines into covered, uncovered, and unknown sets, with contiguous gap ranges for review. It runs the same pure JavaScript engine in the browser and Node tests. All input is provided by the user or the included synthetic fixture; no external facts are inferred.

## Implemented features

- Editable scenario with a synthetic example and reset control.
- Deterministic analysis, summary metrics, filterable result table, and JSON report export.
- Input validation, explicit errors, and invalidation of outdated reports after edits.
- Keyboard-accessible controls, responsive layout, and large-screen CSS.
- Zero runtime dependencies and no external API calls.

## Install and run

Requirements: Python 3 for a static local server, Node.js 22 or later for tests.

```sh
git clone https://github.com/Royalpuskar/test-gap-map.git
cd test-gap-map
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open index.html through a file URL; ES modules require a server.

```sh
node --test test.mjs
```

## Example and schema

The complete example in `sample.mjs` defines the supported input shape:

```json
{
  "files": [
    {
      "path": "engine.js",
      "changed": [
        2,
        3,
        4,
        4
      ],
      "covered": [
        2,
        7
      ]
    },
    {
      "path": "ui.js",
      "changed": [
        10
      ],
      "covered": [
        10
      ]
    }
  ]
}
```

Edit one value and select **Run analysis**. **Reset example** restores the fixture. **Export report** downloads the current result; it never publishes it.

Input is capped at 200,000 serialized characters, arrays processed by the engine at 500 elements, and numeric magnitudes at 1e12. Domain constraints are checked inside `engine.mjs`; unsupported structures return an error.

## Instrumentation-aware evidence

Each file may optionally include `instrumented`, the lines for which the coverage producer reports execution counts (including zero). `covered` must be a subset of that list. A changed line in `covered` is covered; an instrumented changed line absent from `covered` is uncovered; a changed line absent from instrumentation is unknown.

If `instrumented` is omitted, the legacy assumption is preserved: every changed line not covered is uncovered. The evidence explicitly labels this mode `assumed-complete`; it is not proof that instrumentation exists.

```json
{"files":[{"path":"engine.js","changed":[1,2,3,4],
"covered":[1],"instrumented":[1,2]}]}
```

Expected result: one covered line, one uncovered line, two unknown lines; measured coverage is 50% and `summary.complete` is false. Measured coverage uses covered / (covered + uncovered), excluding unknown lines. It is null when no changed lines have measured/assumed coverage. Even 100% measured coverage can coexist with unknown lines.

Structured `evidence` includes line arrays and inclusive `uncoveredRanges` / `unknownRanges` with start and end values. Rows retain the original uncovered-line display and add covered/unknown counts and measured percentages. Aggregate percentage is weighted by line counts, not an average of file percentages.

All line lists are deduplicated and sorted numerically. Duplicate exact file paths are rejected to avoid double counting. Paths are case-sensitive labels; no filesystem lookup, slash conversion, or alias normalization occurs. Covered lines outside the changed set do not contribute to changed-line metrics, but must still be instrumented when that field is supplied.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses scenario JSON and calls `run` from `engine.mjs`. The engine returns `metrics` and `rows`; the UI renders values with `textContent`, never user-supplied HTML. Editing invalidates the prior report. Export creates a local Blob download.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

Relies on externally supplied line lists; does not measure coverage, validate their commit identity, or decide which lines are executable. Unknown is an evidence gap, not a failed test. “Complete” only means no unknown changed lines under the selected input mode, not complete testing. Line execution does not establish meaningful assertions, branch coverage, or correctness.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

Ten local Node tests pass for this update. They cover incomplete evidence, null percentages, duplicate-path rejection, contradictory instrumentation, range compression, weighted aggregation, and legacy behavior. A bounded exhaustive test checks all 81 classifications of four changed lines into covered, uncovered, or unknown sets. These are reproducible fixture results, not production accuracy claims. Mobile, laptop, and 3840×2160 browser checks have not been performed for this update.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.

