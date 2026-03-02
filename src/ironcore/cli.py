import argparse
from pathlib import Path

from .pipeline import run_pipeline

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="IRONCORE MVP pipeline")
    parser.add_argument("--max-risks", type=int, default=10)
    parser.add_argument("--input-dir", type=Path, default=ROOT / "sources")
    parser.add_argument("--processed-dir", type=Path, default=ROOT / "processed")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "outputs")
    parser.add_argument("--config-dir", type=Path, default=ROOT / "config")
    parser.add_argument("--log-dir", type=Path, default=ROOT / "logs")
    parser.add_argument("--eval-dir", type=Path, default=ROOT / "evals")
    parser.add_argument("--run-id", type=str, default=None)
    parser.add_argument("--fail-on-issues", action="store_true")
    parser.add_argument("--fail-on-regression", action="store_true")
    parser.add_argument("--update-baseline", action="store_true")
    args = parser.parse_args()

    code = run_pipeline(
        max_risks=args.max_risks,
        input_dir=args.input_dir,
        processed_dir=args.processed_dir,
        output_dir=args.output_dir,
        config_dir=args.config_dir,
        log_dir=args.log_dir,
        eval_dir=args.eval_dir,
        run_id=args.run_id,
        fail_on_issues=args.fail_on_issues,
        fail_on_regression=args.fail_on_regression,
        update_baseline=args.update_baseline,
    )
    raise SystemExit(code)


if __name__ == "__main__":
    main()
