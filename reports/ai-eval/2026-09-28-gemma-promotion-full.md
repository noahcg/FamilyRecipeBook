# Workers AI evaluation — 2026-09-28

Evaluator: `recipe-tasks-v3` · Prompt versions: production registry · 27 live calls

## Predeclared gates

- Overall invariant pass rate: at least 90%
- Recipe schema rate: at least 95%
- Critical recipe constraint failures: 0
- API error rate: at most 5%
- Human quality review: required before promoting a challenger; intentionally not represented as automated evidence.

## Results

| Model | Pass rate | Recipe schema | Critical failures | Error rate | p50 | p95 | Observed neurons (estimated) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `@cf/google/gemma-4-26b-a4b-it` | 96.3% | 95.0% | 1 | 0.0% | 8088 ms | 16032 ms | 283.3 |

## Task pass rates

| Model | Generation | Description | Image query | Image ranking |
| --- | ---: | ---: | ---: | ---: |
| `@cf/google/gemma-4-26b-a4b-it` | 95.0% | 100.0% | 100.0% | 100.0% |

## Failures

- generation-dessert · `@cf/google/gemma-4-26b-a4b-it`: invalid_recipe_schema

## Decision status

Model selection is intentionally not generated from these automated scores. Record the current decision and required blinded human-review status in `docs/ai-model-review.md` after inspecting the report.

## Interpretation

This report uses synthetic prompts and objective contract checks. Recipe checks enforce the structured response contract, require usable ingredient quantities, scan all generated recipe text for forbidden terms while permitting explicit negations and declared phrases, and treat common pasta names as equivalents. Generated outputs remain in the JSON report for blinded human review. A model is not promoted solely because it is newer, cheaper, or faster.
