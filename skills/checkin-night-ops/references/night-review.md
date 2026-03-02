# Night Review Checklist (Ironcore)

1. Check latest run summary in each active project:
   - `projects/<id>/outputs/comite.json`
   - Compare risk counts, critical/high, issues vs previous daily snapshot.

2. Check lifecycle health:
   - `projects/<id>/history/risk_ledger.json`
   - Count open/reopened/monitoring/resolved.

3. Check SLA pressure:
   - `projects/<id>/outputs/sla_alerts.json`
   - Highlight only warning/critical items.

4. Check execution reliability:
   - service health (dashboard / runners)
   - latest logs for failures/regressions.

5. Produce one concise suggestion set for morning:
   - 1 strategic improvement
   - 1 execution improvement
   - 1 risk mitigation action
