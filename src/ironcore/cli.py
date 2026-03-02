import argparse
from pathlib import Path

from .pipeline import run_pipeline
from .projects import get_project, project_dirs, register_project

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="IRONCORE MVP pipeline")
    parser.add_argument("--project", type=str, help="Project id (required for run mode)")
    parser.add_argument("--register-project", type=str, default=None, help="Create/register project id")
    parser.add_argument("--project-name", type=str, default=None, help="Optional project display name")

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
    )
    raise SystemExit(code)


if __name__ == "__main__":
    main()
