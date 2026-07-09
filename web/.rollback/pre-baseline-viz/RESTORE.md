# Rollback: pre-baseline-viz

Created before adding population-average biomarker baseline comparison charts.

## Restore

```bash
cd /Users/kiki/bio-age-tool/web
cp .rollback/pre-baseline-viz/ResultsPanel.tsx components/
cp .rollback/pre-baseline-viz/ComparisonChart.tsx components/
cp .rollback/pre-baseline-viz/page.tsx app/
```

## Files backed up

- `components/ResultsPanel.tsx`
- `components/ComparisonChart.tsx`
- `app/page.tsx`
