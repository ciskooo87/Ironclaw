import json
from pathlib import Path
from typing import Any, Dict, List


def render_markdown(summary: Dict[str, Any], top_risks: List[Dict[str, Any]], eval_result: Dict[str, Any]) -> str:
    lines = [
        "# Comitê de Turnaround — Saída IRONCORE (MVP)", "", "## Resumo executivo",
        f"- Registros processados: **{summary['processed']}**",
        f"- Riscos únicos identificados: **{summary['risks']}**",
        f"- Críticos/Altos: **{summary['critical_high']}**",
        f"- Issues de dados: **{summary['issues']}**",
        f"- Status de eval: **{eval_result['status']}**", "", "## Top riscos priorizados",
    ]
    for i, r in enumerate(top_risks, start=1):
        w = r["action_5w2h"]
        lines.extend([
            f"### {i}. [{r['level']}] {r['kpi']} — {r['unidade']}",
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
    report = {"summary": summary, "top_risks": top_risks, "issues": issues, "eval": eval_result}
    (output_dir / "comite.json").write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    (output_dir / "comite.md").write_text(render_markdown(summary, top_risks, eval_result), encoding="utf-8")
