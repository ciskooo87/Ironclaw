import datetime as dt
import glob
import logging
from pathlib import Path
from typing import Dict, List

from .config import load_mappings, load_rules
from .evals import run_evals
from .ingestion import load_csv, load_xlsx
from .reporting import write_outputs, cluster_summary
from .risk_engine import build_facts, build_risks, validate_rows
from .targets import load_kpi_targets, load_materiality
from .history import update_risk_history
from .llm import enrich_risks_with_llm
from .incremental import load_checkpoint, save_checkpoint, filter_rows_incremental


def setup_logging(log_dir: Path, run_id: str | None = None) -> Path:
    ts = run_id or dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = log_dir / f"run-{ts}.log"
    log_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.FileHandler(log_path), logging.StreamHandler()],
    )
    return log_path


def ensure_dirs(*dirs: Path) -> None:
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def run_pipeline(
    *,
    max_risks: int,
    input_dir: Path,
    processed_dir: Path,
    output_dir: Path,
    config_dir: Path,
    log_dir: Path,
    eval_dir: Path,
    run_id: str | None,
    fail_on_issues: bool,
    fail_on_regression: bool,
    update_baseline: bool,
    llm_enable: bool,
    llm_model: str,
    llm_max_items: int,
    analysis_mode: str,
) -> int:
    ensure_dirs(input_dir, processed_dir, output_dir, config_dir, log_dir, eval_dir)
    log_path = setup_logging(log_dir, run_id=run_id)
    logging.info("Iniciando pipeline MVP IRONCORE")

    aliases, required_fields = load_mappings(config_dir)
    files = [Path(p) for p in glob.glob(str(input_dir / "*"))]
    csv_files = [p for p in files if p.suffix.lower() == ".csv"]
    xlsx_files = [p for p in files if p.suffix.lower() in {".xlsx", ".xlsm", ".xls"}]
    if not csv_files and not xlsx_files:
        logging.warning("Nenhum arquivo de entrada em %s", input_dir)
        return 2

    rows: List[Dict] = []
    issues: List[Dict] = []
    for f in csv_files:
        loaded_rows, load_issues = load_csv(f, aliases, required_fields)
        rows.extend(loaded_rows); issues.extend(load_issues)
    for f in xlsx_files:
        loaded_rows, load_issues = load_xlsx(f, aliases, required_fields)
        rows.extend(loaded_rows); issues.extend(load_issues)

    project_base = config_dir.parent
    cp = load_checkpoint(project_base)
    rows = filter_rows_incremental(rows, analysis_mode, cp)

    valid_rows, validation_issues = validate_rows(rows, required_fields)
    issues.extend(validation_issues)
    kpi_targets = load_kpi_targets(config_dir)
    materiality_min_impact = load_materiality(config_dir)

    facts = build_facts(valid_rows, kpi_targets=kpi_targets)
    risks = build_risks(facts, load_rules(config_dir), materiality_min_impact=materiality_min_impact)
    if llm_enable and risks:
        risks = enrich_risks_with_llm(risks, max_items=llm_max_items, model=llm_model)

    summary = {
        "analysis_mode": analysis_mode,
        "processed": len(facts),
        "risks": len(risks),
        "materiality_min_impact": materiality_min_impact,
        "critical_high": len([r for r in risks if r["level"] in {"Crítico", "Alto"}]),
        "issues": len(issues),
        "generated_at": dt.datetime.now().isoformat(),
        "log_file": log_path.name,
        "run_id": run_id,
    }

    eval_result = run_evals(summary, risks[:max_risks], eval_dir, run_id=run_id, update_baseline=update_baseline)
    clusters = cluster_summary(risks)
    update_risk_history(project_base, summary, risks, clusters)
    write_outputs(output_dir, processed_dir, facts, risks, issues, summary, eval_result, max_risks)

    periodos = [str(r.get("periodo", "")) for r in valid_rows]
    save_checkpoint(project_base, run_id, periodos)

    if fail_on_issues and issues:
        return 3
    if fail_on_regression and eval_result["regressions"]:
        return 4
    return 0
