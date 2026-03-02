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


def load_rules(config_dir: Path):
    yaml_path = config_dir / "risk_rules.yaml"
    if yaml_path.exists():
        try:
            import yaml  # type: ignore
            content = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
            return content.get("rules", [])
        except Exception as e:
            logging.warning("Falha risk_rules.yaml (%s).", e)
    return [
        {"name": "desvio_critico", "condition": "valor_atual < meta * 0.8", "impact": 5, "urgency": 5, "description": "Desvio crítico vs meta"},
        {"name": "abaixo_meta", "condition": "valor_atual < meta", "impact": 4, "urgency": 4, "description": "KPI abaixo da meta"},
    ]
