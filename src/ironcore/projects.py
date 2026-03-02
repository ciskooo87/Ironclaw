import json
import datetime as dt
from pathlib import Path
from typing import Dict, Any


def registry_path(root: Path) -> Path:
    return root / "projects_registry.json"


def load_registry(root: Path) -> Dict[str, Any]:
    path = registry_path(root)
    if not path.exists():
        return {"projects": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def save_registry(root: Path, data: Dict[str, Any]) -> None:
    registry_path(root).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def register_project(root: Path, project_id: str, name: str | None = None) -> Dict[str, Any]:
    data = load_registry(root)
    dirs = project_dirs(root, project_id)
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    # Seed config from global defaults when available
    global_cfg = root / "config"
    for cfg_name in ["mappings.json", "risk_rules.yaml"]:
        src = global_cfg / cfg_name
        dst = dirs["config"] / cfg_name
        if src.exists() and not dst.exists():
            dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    if project_id in data.get("projects", {}):
        return data["projects"][project_id]

    entry = {
        "id": project_id,
        "name": name or project_id,
        "status": "active",
        "created_at": dt.datetime.now().isoformat(),
    }
    data.setdefault("projects", {})[project_id] = entry
    save_registry(root, data)
    return entry


def get_project(root: Path, project_id: str) -> Dict[str, Any] | None:
    return load_registry(root).get("projects", {}).get(project_id)


def project_dirs(root: Path, project_id: str) -> Dict[str, Path]:
    base = root / "projects" / project_id
    return {
        "base": base,
        "sources": base / "sources",
        "processed": base / "processed",
        "outputs": base / "outputs",
        "config": base / "config",
        "logs": base / "logs",
        "evals": base / "evals",
    }
