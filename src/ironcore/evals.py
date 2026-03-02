import datetime as dt
import json
from pathlib import Path
from typing import Any, Dict, List


def run_evals(summary: Dict[str, Any], top_risks: List[Dict[str, Any]], eval_dir: Path, run_id: str | None = None, update_baseline: bool = False) -> Dict[str, Any]:
    eval_dir.mkdir(parents=True, exist_ok=True)
    baseline_path = eval_dir / "baseline.json"
    metrics = {
        "processed": summary["processed"],
        "risks": summary["risks"],
        "critical_high": summary["critical_high"],
        "issues": summary["issues"],
        "evidence_coverage": 1.0 if top_risks and all(r.get("evidence") for r in top_risks) else (1.0 if not top_risks else 0.0),
    }
    baseline = json.loads(baseline_path.read_text(encoding="utf-8")) if baseline_path.exists() else None
    regressions: List[Dict[str, Any]] = []
    if baseline:
        b = baseline.get("metrics", {})
        if metrics["evidence_coverage"] < b.get("evidence_coverage", 0):
            regressions.append({"metric": "evidence_coverage", "baseline": b.get("evidence_coverage"), "current": metrics["evidence_coverage"], "severity": "critical"})
        if metrics["issues"] > b.get("issues", 0):
            regressions.append({"metric": "issues", "baseline": b.get("issues"), "current": metrics["issues"], "severity": "warning"})
    result = {
        "run_id": run_id,
        "generated_at": dt.datetime.now().isoformat(),
        "metrics": metrics,
        "baseline_found": bool(baseline),
        "regressions": regressions,
        "status": "fail" if any(r["severity"] == "critical" for r in regressions) else ("warn" if regressions else "pass"),
    }
    (eval_dir / "latest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    if update_baseline or not baseline_path.exists():
        baseline_path.write_text(json.dumps({"updated_at": dt.datetime.now().isoformat(), "run_id": run_id, "metrics": metrics}, ensure_ascii=False, indent=2), encoding="utf-8")
    return result
