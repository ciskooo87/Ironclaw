from typing import Any, Dict, List, Tuple

from .utils import to_float


def validate_rows(rows: List[Dict[str, Any]], required_fields: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    valid, issues = [], []
    for row in rows:
        missing = [f for f in required_fields if str(row.get(f, "")).strip() == ""]
        if missing:
            issues.append({"type": "missing_required_fields", "missing": missing, "fonte_arquivo": row.get("fonte_arquivo"), "linha": row.get("linha")})
            continue
        valid.append(row)
    return valid, issues


def build_facts(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    facts = []
    for r in rows:
        valor = to_float(r["valor_atual"])
        meta = to_float(r["meta"])
        facts.append({
            "periodo": r["periodo"], "unidade": r["unidade"], "kpi": r["kpi"],
            "valor_atual": valor, "meta": meta, "desvio": valor - meta,
            "variacao": r.get("variacao", ""), "observacao": r.get("observacao", ""),
            "evidence": {"source_file": r["fonte_arquivo"], "line": r["linha"]},
        })
    return facts


def eval_condition(cond: str, ctx: Dict[str, Any]) -> bool:
    allowed = {"valor_atual": ctx["valor_atual"], "meta": ctx["meta"], "variacao": to_float(ctx.get("variacao", 0))}
    try:
        return bool(eval(cond, {"__builtins__": {}}, allowed))
    except Exception:
        return False


def level(score: int) -> str:
    if score >= 16:
        return "Crítico"
    if score >= 9:
        return "Alto"
    if score >= 4:
        return "Médio"
    return "Baixo"


def build_risks(facts: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}
    for f in facts:
        key = f"{f['periodo']}|{f['unidade']}|{f['kpi']}"
        for rule in rules:
            if not eval_condition(rule.get("condition", "False"), f):
                continue
            impact = int(rule.get("impact", 3)); urgency = int(rule.get("urgency", 3)); score = impact * urgency
            if key not in grouped:
                grouped[key] = {
                    "periodo": f["periodo"], "unidade": f["unidade"], "kpi": f["kpi"],
                    "valor_atual": f["valor_atual"], "meta": f["meta"],
                    "impact": impact, "urgency": urgency, "score": score, "level": level(score),
                    "triggered_rules": [rule.get("name")],
                    "triggered_descriptions": [rule.get("description", "Risco identificado")],
                    "action_owner_suggestion": f"Responsável de {f['unidade']}",
                    "action_5w2h": {
                        "what": f"Recuperar KPI {f['kpi']} para meta",
                        "why": rule.get("description", "Mitigar risco operacional/financeiro"),
                        "where": f["unidade"], "when": "Próximo ciclo semanal",
                        "who": f"Gestor(a) de {f['unidade']}",
                        "how": "Plano de ação focado em causa raiz + cadência semanal", "how_much": "A definir",
                    },
                    "evidence": f["evidence"],
                }
            else:
                g = grouped[key]
                g["triggered_rules"].append(rule.get("name")); g["triggered_descriptions"].append(rule.get("description", "Risco identificado"))
                if score > g["score"]:
                    g["impact"], g["urgency"], g["score"], g["level"] = impact, urgency, score, level(score)
                    g["action_5w2h"]["why"] = rule.get("description", "Mitigar risco operacional/financeiro")
    risks = list(grouped.values())
    for r in risks:
        r["triggered_rules"] = sorted(list(set(r["triggered_rules"]))); r["triggered_descriptions"] = sorted(list(set(r["triggered_descriptions"])))
    risks.sort(key=lambda x: x["score"], reverse=True)
    return risks
