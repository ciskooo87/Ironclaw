from pathlib import Path
from typing import Dict, Any


def load_kpi_targets(config_dir: Path) -> Dict[str, Any]:
    path = config_dir / "kpi_targets.yaml"
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore

        content = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return content.get("targets", {}) or {}
    except Exception:
        return {}


def load_materiality(config_dir: Path) -> float:
    path = config_dir / "risk_profile.yaml"
    if not path.exists():
        return 0.0
    try:
        import yaml  # type: ignore

        content = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return float(content.get("materiality_min_impact", 0) or 0)
    except Exception:
        return 0.0
