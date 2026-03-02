import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

from .utils import norm_key

DEFAULT_REQUIRED_FIELDS = ["periodo", "unidade", "kpi", "valor_atual", "meta"]


def load_mappings(config_dir: Path) -> Tuple[Dict[str, List[str]], List[str]]:
    path = config_dir / "mappings.json"
    aliases: Dict[str, List[str]] = {
        "periodo": ["periodo", "mes", "data"],
        "unidade": ["unidade", "area", "bu"],
        "kpi": ["kpi", "indicador", "metric"],
        "valor_atual": ["valor_atual", "valor", "atual"],
        "meta": ["meta", "target"],
        "variacao": ["variacao", "delta"],
        "observacao": ["observacao", "nota", "comentario"],
    }
    required_fields = DEFAULT_REQUIRED_FIELDS.copy()
    if path.exists():
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
            file_aliases = content.get("aliases", {})
            aliases = {k: [norm_key(k)] + [norm_key(a) for a in v] for k, v in file_aliases.items()}
            required_fields = [norm_key(x) for x in content.get("required_fields", DEFAULT_REQUIRED_FIELDS)]
        except Exception as e:
            logging.warning("Falha mappings.json (%s).", e)
    return aliases, required_fields


def _default_rules() -> List[Dict]:
    return [
        {"name": "desvio_critico", "condition": "valor_atual < meta * 0.8", "impact": 5, "urgency": 5, "description": "Desvio crítico vs meta"},
        {"name": "abaixo_meta", "condition": "valor_atual < meta", "impact": 4, "urgency": 4, "description": "KPI abaixo da meta"},
    ]


def _load_yaml_rules(path: Path) -> Tuple[List[Dict], Dict]:
    import yaml  # type: ignore

    content = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    rules = content.get("rules", [])
    meta = {
        "version": content.get("version", "n/a"),
        "owner": content.get("owner", "n/a"),
        "updated_at": content.get("updated_at", "n/a"),
        "source": str(path),
    }
    return rules, meta


def validate_rules(rules: List[Dict]) -> List[str]:
    problems: List[str] = []
    for i, r in enumerate(rules, start=1):
        for k in ["name", "condition", "impact", "urgency", "description"]:
            if k not in r:
                problems.append(f"rule[{i}] missing '{k}'")
        try:
            impact = int(r.get("impact", 0))
            urgency = int(r.get("urgency", 0))
            if impact < 1 or impact > 5:
                problems.append(f"rule[{i}] impact out of range (1-5)")
            if urgency < 1 or urgency > 5:
                problems.append(f"rule[{i}] urgency out of range (1-5)")
        except Exception:
            problems.append(f"rule[{i}] impact/urgency must be integer")
    return problems


def load_rules(config_dir: Path):
    project_yaml = config_dir / "risk_rules.yaml"

    if project_yaml.exists():
        try:
            rules, _ = _load_yaml_rules(project_yaml)
            return rules
        except Exception as e:
            logging.warning("Falha risk_rules.yaml do projeto (%s).", e)

    # Fallback para config global do workspace
    global_yaml = config_dir.parents[2] / "config" / "risk_rules.yaml" if len(config_dir.parents) >= 3 else None
    if global_yaml and global_yaml.exists():
        try:
            rules, _ = _load_yaml_rules(global_yaml)
            return rules
        except Exception as e:
            logging.warning("Falha risk_rules.yaml global (%s).", e)

    return _default_rules()


def load_rules_with_meta(config_dir: Path) -> Tuple[List[Dict], Dict]:
    project_yaml = config_dir / "risk_rules.yaml"
    if project_yaml.exists():
        rules, meta = _load_yaml_rules(project_yaml)
        meta["scope"] = "project"
        return rules, meta

    global_yaml = config_dir.parents[2] / "config" / "risk_rules.yaml" if len(config_dir.parents) >= 3 else None
    if global_yaml and global_yaml.exists():
        rules, meta = _load_yaml_rules(global_yaml)
        meta["scope"] = "global-fallback"
        return rules, meta

    return _default_rules(), {"scope": "built-in-default", "source": "internal"}
