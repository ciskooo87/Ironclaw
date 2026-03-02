import json
from pathlib import Path
from typing import Any, Dict, List


def checkpoint_path(project_base: Path) -> Path:
    return project_base / "history" / "checkpoint.json"


def load_checkpoint(project_base: Path) -> Dict[str, Any]:
    p = checkpoint_path(project_base)
    if not p.exists():
        return {"last_run_id": None, "last_periodo_processed": None}
    return json.loads(p.read_text(encoding="utf-8"))


def save_checkpoint(project_base: Path, run_id: str | None, periodos: List[str]) -> None:
    p = checkpoint_path(project_base)
    p.parent.mkdir(parents=True, exist_ok=True)
    prev = load_checkpoint(project_base)
    clean = sorted([x for x in periodos if str(x).strip() != ""])
    payload = {
        "last_run_id": run_id,
        "last_periodo_processed": clean[-1] if clean else prev.get("last_periodo_processed"),
    }
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def filter_rows_incremental(rows: List[Dict[str, Any]], mode: str, checkpoint: Dict[str, Any]) -> List[Dict[str, Any]]:
    if mode == "full":
        return rows

    if mode == "daily":
        # Daily mode: keep rows from latest periodo found in current batch
        periodos = sorted({str(r.get("periodo", "")) for r in rows if str(r.get("periodo", "")).strip() != ""})
        if not periodos:
            return rows
        latest = periodos[-1]
        return [r for r in rows if str(r.get("periodo", "")) == latest]

    # since_last (default incremental)
    last = checkpoint.get("last_periodo_processed")
    if not last:
        return rows
    return [r for r in rows if str(r.get("periodo", "")) > str(last)]
