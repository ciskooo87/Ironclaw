import argparse
import datetime as dt
from pathlib import Path

from .pipeline import run_pipeline
from .projects import get_project, project_dirs, register_project
from .config import load_rules_with_meta, validate_rules
from .reconciliation import reconcile_previous_day

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="IRONCORE MVP pipeline")
    parser.add_argument("--project", type=str, help="Project id (required for run mode)")
    parser.add_argument("--register-project", type=str, default=None, help="Create/register project id")
    parser.add_argument("--project-name", type=str, default=None, help="Optional project display name")

    parser.add_argument("--validate-rules", action="store_true", help="Validate project risk rules and exit")
    parser.add_argument("--max-risks", type=int, default=10)
    parser.add_argument("--input-dir", type=Path, default=None)
    parser.add_argument("--processed-dir", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--config-dir", type=Path, default=None)
    parser.add_argument("--log-dir", type=Path, default=None)
    parser.add_argument("--eval-dir", type=Path, default=None)
    parser.add_argument("--run-id", type=str, default=None)
    parser.add_argument("--fail-on-issues", action="store_true")
    parser.add_argument("--fail-on-regression", action="store_true")
    parser.add_argument("--update-baseline", action="store_true")
    parser.add_argument("--llm-enable", action="store_true")
    parser.add_argument("--llm-model", type=str, default="deepseek-chat")
    parser.add_argument("--llm-max-items", type=int, default=10)
    parser.add_argument("--analysis-mode", choices=["since_last", "daily", "full"], default="since_last")

    # Reconciliação bancária (novo módulo)
    parser.add_argument("--reconcile-bank", action="store_true", help="Executa conciliação do dia anterior (extrato x contas a pagar)")
    parser.add_argument("--statement-file", type=Path, default=None, help="Arquivo de extrato bancário (.csv/.xlsx)")
    parser.add_argument("--payable-file", type=Path, default=None, help="Arquivo detalhado de contas a pagar (.csv/.xlsx)")
    parser.add_argument("--reference-date", type=str, default=None, help="Data de referência YYYY-MM-DD (concilia D-1)")
    parser.add_argument("--reconcile-tolerance", type=float, default=0.01, help="Tolerância de valor na conciliação")
    args = parser.parse_args()

    if args.register_project:
        p = register_project(ROOT, args.register_project, args.project_name)
        print(f"Project registered: {p['id']} ({p['name']})")
        raise SystemExit(0)

    if not args.project:
        print("Erro: informe --project <id> para executar o pipeline.")
        raise SystemExit(2)

    project = get_project(ROOT, args.project)
    if not project:
        print(f"Erro: projeto '{args.project}' não cadastrado. Use --register-project {args.project}")
        raise SystemExit(2)

    dirs = project_dirs(ROOT, args.project)

    if args.reconcile_bank:
        statement_file = args.statement_file or (dirs['sources'] / 'extrato_bancario.csv')
        payable_file = args.payable_file or (dirs['sources'] / 'contas_pagar_detalhado.csv')
        if not statement_file.exists():
            print(f"Erro: extrato não encontrado em {statement_file}")
            raise SystemExit(2)
        if not payable_file.exists():
            print(f"Erro: contas a pagar detalhado não encontrado em {payable_file}")
            raise SystemExit(2)

        ref_date = dt.date.fromisoformat(args.reference_date) if args.reference_date else dt.date.today()
        result = reconcile_previous_day(
            project_base=dirs['base'],
            statement_path=statement_file,
            payable_path=payable_file,
            reference_date=ref_date,
            tolerance=args.reconcile_tolerance,
        )
        print("Conciliação executada com sucesso")
        print(f"Output: {result['output']}")
        print(f"Resumo: {result['summary']}")
        if result['closing_balance_applied'] is not None:
            print(f"Saldo apropriado no cashflow_settings: {result['closing_balance_applied']}")
        raise SystemExit(0)

    if args.validate_rules:
        rules, meta = load_rules_with_meta(dirs['config'])
        problems = validate_rules(rules)
        print(f"Risk rules scope: {meta.get('scope')} | source: {meta.get('source')}")
        print(f"Rules loaded: {len(rules)}")
        if problems:
            print("Validation: FAIL")
            for p in problems:
                print(f"- {p}")
            raise SystemExit(1)
        print("Validation: PASS")
        raise SystemExit(0)

    code = run_pipeline(
        max_risks=args.max_risks,
        input_dir=args.input_dir or dirs['sources'],
        processed_dir=args.processed_dir or dirs['processed'],
        output_dir=args.output_dir or dirs['outputs'],
        config_dir=args.config_dir or dirs['config'],
        log_dir=args.log_dir or dirs['logs'],
        eval_dir=args.eval_dir or dirs['evals'],
        run_id=args.run_id,
        fail_on_issues=args.fail_on_issues,
        fail_on_regression=args.fail_on_regression,
        update_baseline=args.update_baseline,
        llm_enable=args.llm_enable,
        llm_model=args.llm_model,
        llm_max_items=args.llm_max_items,
        analysis_mode=args.analysis_mode,
    )
    raise SystemExit(code)


if __name__ == "__main__":
    main()
