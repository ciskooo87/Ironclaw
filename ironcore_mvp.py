#!/usr/bin/env python3
import argparse
import csv
import datetime as dt
import glob
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / "sources"
PROCESSED = ROOT / "processed"
OUTPUTS = ROOT / "outputs"
CONFIG = ROOT / "config"
LOGS = ROOT / "logs"

REQUIRED_FIELDS = ["periodo", "unidade", "kpi", "valor_atual", "meta"]


def setup_logging() -> Path:
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = LOGS / f"run-{ts}.log"
    LOGS.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.FileHandler(log_path), logging.StreamHandler()],
    )
    return log_path


def to_float(val: Any) -> float:
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    s = s.replace("R$", "").replace("%", "").strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def norm_key(key: str) -> str:
    k = key.strip().lower()
    return re.sub(r"\s+", "_", k)


def normalize_row(row: Dict[str, Any], source_file: str, idx: int) -> Dict[str, Any]:
    normalized = {norm_key(k): v for k, v in row.items()}
    return {
        "periodo": normalized.get("periodo") or normalized.get("mes") or normalized.get("data") or "",
        "unidade": normalized.get("unidade") or normalized.get("area") or normalized.get("bu") or "",
        "kpi": normalized.get("kpi") or normalized.get("indicador") or normalized.get("metric") or "",
        "valor_atual": normalized.get("valor_atual") or normalized.get("valor") or normalized.get("atual") or "0",
        "meta": normalized.get("meta") or normalized.get("target") or "0",
        "variacao": normalized.get("variacao") or normalized.get("variação") or "",
        "observacao": normalized.get("observacao") or normalized.get("observação") or "",
        "fonte_arquivo": source_file,
        "linha": idx,
    }


def load_csv(file_path: Path) -> List[Dict[str, Any]]:
    rows = []
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):
            rows.append(normalize_row(row, file_path.name, idx))
    return rows


def load_xlsx(file_path: Path) -> List[Dict[str, Any]]:
    try:
        from openpyxl import load_workbook
    except Exception:
        logging.warning("openpyxl não encontrado. Ignorando XLSX: %s", file_path.name)
        return []

    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active
    data = list(ws.iter_rows(values_only=True))
    if not data:
        return []
    headers = [norm_key(str(h or "")) for h in data[0]]
    rows: List[Dict[str, Any]] = []
    for i, values in enumerate(data[1:], start=2):
        row_raw = {headers[c]: values[c] for c in range(min(len(headers), len(values)))}
        rows.append(normalize_row(row_raw, file_path.name, i))
    return rows


def validate_rows(rows: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    valid, issues = [], []
    for row in rows:
        missing = [f for f in REQUIRED_FIELDS if str(row.get(f, "")).strip() == ""]
        if missing:
            issues.append(
                {
                    "type": "missing_required_fields",
                    "missing": missing,
                    "fonte_arquivo": row.get("fonte_arquivo"),
                    "linha": row.get("linha"),
                }
            )
            continue
        valid.append(row)
    return valid, issues


def load_rules() -> List[Dict[str, Any]]:
    yaml_path = CONFIG / "risk_rules.yaml"
    if yaml_path.exists():
        try:
            import yaml  # type: ignore

            content = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
            return content.get("rules", [])
        except Exception as e:
            logging.warning("Falha ao carregar risk_rules.yaml (%s). Usando padrão.", e)

    return [
        {"name": "desvio_critico", "condition": "valor_atual < meta * 0.8", "impact": 5, "urgency": 5, "description": "Desvio crítico vs meta"},
        {"name": "abaixo_meta", "condition": "valor_atual < meta", "impact": 4, "urgency": 4, "description": "KPI abaixo da meta"},
    ]


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


def build_facts(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    facts = []
    for r in rows:
        valor = to_float(r["valor_atual"])
        meta = to_float(r["meta"])
        facts.append(
            {
                "periodo": r["periodo"],
                "unidade": r["unidade"],
                "kpi": r["kpi"],
                "valor_atual": valor,
                "meta": meta,
                "desvio": valor - meta,
                "variacao": r.get("variacao", ""),
                "observacao": r.get("observacao", ""),
                "evidence": {"source_file": r["fonte_arquivo"], "line": r["linha"]},
            }
        )
    return facts


def build_risks(facts: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}
    for f in facts:
        key = f"{f['periodo']}|{f['unidade']}|{f['kpi']}"
        for rule in rules:
            if not eval_condition(rule.get("condition", "False"), f):
                continue
            impact = int(rule.get("impact", 3))
            urgency = int(rule.get("urgency", 3))
            score = impact * urgency

            if key not in grouped:
                grouped[key] = {
                    "periodo": f["periodo"],
                    "unidade": f["unidade"],
                    "kpi": f["kpi"],
                    "valor_atual": f["valor_atual"],
                    "meta": f["meta"],
                    "impact": impact,
                    "urgency": urgency,
                    "score": score,
                    "level": level(score),
                    "triggered_rules": [rule.get("name")],
                    "triggered_descriptions": [rule.get("description", "Risco identificado")],
                    "action_owner_suggestion": f"Responsável de {f['unidade']}",
                    "action_5w2h": {
                        "what": f"Recuperar KPI {f['kpi']} para meta",
                        "why": rule.get("description", "Mitigar risco operacional/financeiro"),
                        "where": f["unidade"],
                        "when": "Próximo ciclo semanal",
                        "who": f"Gestor(a) de {f['unidade']}",
                        "how": "Plano de ação focado em causa raiz + cadência semanal",
                        "how_much": "A definir",
                    },
                    "evidence": f["evidence"],
                }
            else:
                g = grouped[key]
                g["triggered_rules"].append(rule.get("name"))
                g["triggered_descriptions"].append(rule.get("description", "Risco identificado"))
                if score > g["score"]:
                    g["impact"], g["urgency"], g["score"], g["level"] = impact, urgency, score, level(score)
                    g["action_5w2h"]["why"] = rule.get("description", "Mitigar risco operacional/financeiro")

    risks = list(grouped.values())
    for r in risks:
        r["triggered_rules"] = sorted(list(set(r["triggered_rules"])))
        r["triggered_descriptions"] = sorted(list(set(r["triggered_descriptions"])))
    risks.sort(key=lambda x: x["score"], reverse=True)
    return risks


def render_markdown(summary: Dict[str, Any], top_risks: List[Dict[str, Any]]) -> str:
    lines = [
        "# Comitê de Turnaround — Saída IRONCORE (MVP)",
        "",
        "## Resumo executivo",
        f"- Registros processados: **{summary['processed']}**",
        f"- Riscos únicos identificados: **{summary['risks']}**",
        f"- Críticos/Altos: **{summary['critical_high']}**",
        "",
        "## Top riscos priorizados",
    ]

    for i, r in enumerate(top_risks, start=1):
        w = r["action_5w2h"]
        lines.extend(
            [
                f"### {i}. [{r['level']}] {r['kpi']} — {r['unidade']}",
                f"- Score: {r['score']} (impacto {r['impact']} x urgência {r['urgency']})",
                f"- Situação: valor atual {r['valor_atual']} vs meta {r['meta']}",
                f"- Regras acionadas: {', '.join(r['triggered_rules'])}",
                f"- Motivos: {'; '.join(r['triggered_descriptions'])}",
                "- Plano 5W2H:",
                f"  - What: {w['what']}",
                f"  - Why: {w['why']}",
                f"  - Where: {w['where']}",
                f"  - When: {w['when']}",
                f"  - Who: {w['who']}",
                f"  - How: {w['how']}",
                f"  - How much: {w['how_much']}",
                f"- Evidência: {r['evidence']['source_file']}#L{r['evidence']['line']}",
                "",
            ]
        )
    return "\n".join(lines)


def ensure_dirs() -> None:
    for d in [SOURCES, PROCESSED, OUTPUTS, CONFIG, LOGS]:
        d.mkdir(parents=True, exist_ok=True)


def run(max_risks: int = 10) -> int:
    ensure_dirs()
    log_path = setup_logging()
    logging.info("Iniciando pipeline MVP IRONCORE")

    source_files = [Path(p) for p in glob.glob(str(SOURCES / "*"))]
    csv_files = [p for p in source_files if p.suffix.lower() == ".csv"]
    xlsx_files = [p for p in source_files if p.suffix.lower() in {".xlsx", ".xlsm", ".xls"}]

    if not csv_files and not xlsx_files:
        logging.warning("Nenhum arquivo de entrada em sources/")
        return 2

    rows: List[Dict[str, Any]] = []
    for f in csv_files:
        logging.info("Lendo CSV: %s", f.name)
        rows.extend(load_csv(f))
    for f in xlsx_files:
        logging.info("Lendo XLSX: %s", f.name)
        rows.extend(load_xlsx(f))

    valid_rows, issues = validate_rows(rows)
    facts = build_facts(valid_rows)
    risks = build_risks(facts, load_rules())

    (PROCESSED / "issues.json").write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    (PROCESSED / "facts.jsonl").write_text("\n".join(json.dumps(f, ensure_ascii=False) for f in facts), encoding="utf-8")
    (PROCESSED / "risk_register.json").write_text(json.dumps(risks, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "processed": len(facts),
        "risks": len(risks),
        "critical_high": len([r for r in risks if r["level"] in {"Crítico", "Alto"}]),
        "generated_at": dt.datetime.now().isoformat(),
        "log_file": log_path.name,
    }

    report = {"summary": summary, "top_risks": risks[:max_risks]}
    (OUTPUTS / "comite.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUTPUTS / "comite.md").write_text(render_markdown(summary, risks[:max_risks]), encoding="utf-8")

    logging.info("Pipeline concluído. Processados=%s Riscos únicos=%s", summary["processed"], summary["risks"])
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="IRONCORE MVP pipeline")
    parser.add_argument("--max-risks", type=int, default=10)
    args = parser.parse_args()
    raise SystemExit(run(max_risks=args.max_risks))


if __name__ == "__main__":
    main()
