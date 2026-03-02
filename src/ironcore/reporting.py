import json
from pathlib import Path
from typing import Any, Dict, List


def risk_cluster(risk: Dict[str, Any]) -> str:
    key = f"{risk.get('kpi','')} {risk.get('unidade','')}".lower()
    if any(x in key for x in ["faturamento", "receita", "vendas", "receber"]):
        return "Receita"
    if any(x in key for x in ["margem", "cmv", "dre", "resultado"]):
        return "Margem"
    if any(x in key for x in ["devolu", "dev "]):
        return "Devoluções"
    if any(x in key for x in ["estoque", "material", "custo total"]):
        return "Estoque"
    if any(x in key for x in ["fopag", "salario", "fgts", "inss", "encargos", "funcionario"]):
        return "Pessoas"
    if any(x in key for x in ["endividamento", "divida", "despesa financeira", "caixa", "pagar"]):
        return "Endividamento/Caixa"
    return "Outros"


def _priority_from_rank(rank: int) -> str:
    return {1: "P1", 2: "P2"}.get(rank, "P3")


def _impact_estimate(risk: Dict[str, Any]) -> float:
    # Heurística simples: gap absoluto x fator de prioridade
    try:
        valor = float(risk.get("valor_atual", 0) or 0)
        meta = float(risk.get("meta", 0) or 0)
        gap = abs(meta - valor)
        score = int(risk.get("score", 0) or 0)
        factor = 1.0 + (score / 25.0)
        return round(gap * factor, 2)
    except Exception:
        return 0.0


def cluster_summary(risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}
    risks_by_cluster: Dict[str, List[Dict[str, Any]]] = {}

    for r in risks:
        c = risk_cluster(r)
        g = grouped.setdefault(c, {"cluster": c, "count": 0, "max_score": 0, "critical_high": 0})
        g["count"] += 1
        g["max_score"] = max(g["max_score"], int(r.get("score", 0)))
        if r.get("level") in {"Crítico", "Alto"}:
            g["critical_high"] += 1
        risks_by_cluster.setdefault(c, []).append(r)

    out = list(grouped.values())
    out.sort(key=lambda x: (x["critical_high"], x["max_score"], x["count"]), reverse=True)

    for item in out:
        c = item["cluster"]
        top = sorted(risks_by_cluster.get(c, []), key=lambda x: x.get("score", 0), reverse=True)[:3]
        actions = []
        for idx, t in enumerate(top, start=1):
            actions.append(
                {
                    "priority": _priority_from_rank(idx),
                    "kpi": t.get("kpi"),
                    "unidade": t.get("unidade"),
                    "score": t.get("score"),
                    "what": t.get("action_5w2h", {}).get("what"),
                    "who": t.get("action_5w2h", {}).get("who"),
                    "when": t.get("action_5w2h", {}).get("when"),
                    "impacto_estimado": _impact_estimate(t),
                }
            )
        item["top_actions"] = actions
        item["impacto_estimado_cluster"] = round(sum(a["impacto_estimado"] for a in actions), 2)
    return out


def render_markdown(summary: Dict[str, Any], top_risks: List[Dict[str, Any]], eval_result: Dict[str, Any], clusters: List[Dict[str, Any]]) -> str:
    lines = [
        "# Comitê de Turnaround — Saída IRONCORE (MVP)", "", "## Resumo executivo",
        f"- Registros processados: **{summary['processed']}**",
        f"- Riscos únicos identificados: **{summary['risks']}**",
        f"- Críticos/Altos: **{summary['critical_high']}**",
        f"- Issues de dados: **{summary['issues']}**",
        f"- Status de eval: **{eval_result['status']}**",
        "",
        "## Priorização por frente",
    ]
    for c in clusters:
        lines.append(f"- **{c['cluster']}**: {c['count']} riscos | críticos/altos={c['critical_high']} | score máx={c['max_score']} | impacto estimado={c.get('impacto_estimado_cluster', 0)}")
        for a in c.get("top_actions", [])[:3]:
            lines.append(
                f"  - {a.get('priority')}: {a.get('what')} | Dono: {a.get('who')} | Prazo: {a.get('when')} | KPI: {a.get('kpi')} ({a.get('unidade')}) | Impacto est.: {a.get('impacto_estimado')}"
            )

    lines.extend(["", "## Top riscos priorizados"])
    for i, r in enumerate(top_risks, start=1):
        w = r["action_5w2h"]
        lines.extend([
            f"### {i}. [{r['level']}] {r['kpi']} — {r['unidade']} ({risk_cluster(r)})",
            f"- Score: {r['score']} (impacto {r['impact']} x urgência {r['urgency']})",
            f"- Situação: valor atual {r['valor_atual']} vs meta {r['meta']}",
            f"- Regras acionadas: {', '.join(r['triggered_rules'])}",
            f"- Motivos: {'; '.join(r['triggered_descriptions'])}",
            "- Plano 5W2H:",
            f"  - What: {w['what']}", f"  - Why: {w['why']}", f"  - Where: {w['where']}",
            f"  - When: {w['when']}", f"  - Who: {w['who']}", f"  - How: {w['how']}", f"  - How much: {w['how_much']}",
            f"- Evidência: {r['evidence']['source_file']}#L{r['evidence']['line']}", "",
        ])
    return "\n".join(lines)


def write_outputs(output_dir: Path, processed_dir: Path, facts: List[Dict[str, Any]], risks: List[Dict[str, Any]], issues: List[Dict[str, Any]], summary: Dict[str, Any], eval_result: Dict[str, Any], max_risks: int) -> None:
    (processed_dir / "issues.json").write_text(json.dumps(issues, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    (processed_dir / "facts.jsonl").write_text("\n".join(json.dumps(f, ensure_ascii=False, default=str) for f in facts), encoding="utf-8")
    (processed_dir / "risk_register.json").write_text(json.dumps(risks, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    top_risks = risks[:max_risks]
    clusters = cluster_summary(risks)
    report = {"summary": summary, "clusters": clusters, "top_risks": top_risks, "issues": issues, "eval": eval_result}
    (output_dir / "comite.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    (output_dir / "comite.md").write_text(render_markdown(summary, top_risks, eval_result, clusters), encoding="utf-8")
