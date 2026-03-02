import csv
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .utils import norm_key


def map_value(normalized: Dict[str, Any], aliases: Dict[str, List[str]], field: str, default: Any = "") -> Any:
    for c in aliases.get(field, [field]):
        if c in normalized and str(normalized[c]).strip() != "":
            return normalized[c]
    return default


def normalize_row(row: Dict[str, Any], source_file: str, idx: int, aliases: Dict[str, List[str]]) -> Dict[str, Any]:
    normalized = {norm_key(k): v for k, v in row.items()}
    return {
        "periodo": map_value(normalized, aliases, "periodo", ""),
        "unidade": map_value(normalized, aliases, "unidade", ""),
        "kpi": map_value(normalized, aliases, "kpi", ""),
        "valor_atual": map_value(normalized, aliases, "valor_atual", "0"),
        "meta": map_value(normalized, aliases, "meta", "0"),
        "variacao": map_value(normalized, aliases, "variacao", ""),
        "observacao": map_value(normalized, aliases, "observacao", ""),
        "fonte_arquivo": source_file,
        "linha": idx,
    }


def normalize_headers(headers: List[str]) -> List[str]:
    return [norm_key(str(h or "")) for h in headers]


def validate_required_headers(headers: List[str], aliases: Dict[str, List[str]], required_fields: List[str]) -> List[str]:
    header_set = set(headers)
    missing = []
    for field in required_fields:
        if not set(aliases.get(field, [field])).intersection(header_set):
            missing.append(field)
    return missing


def load_csv(file_path: Path, aliases: Dict[str, List[str]], required_fields: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    rows, issues = [], []
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = normalize_headers(reader.fieldnames or [])
        missing_headers = validate_required_headers(headers, aliases, required_fields)
        if missing_headers:
            issues.append({"type": "missing_required_headers", "missing_headers": missing_headers, "fonte_arquivo": file_path.name})
            return rows, issues
        for idx, row in enumerate(reader, start=2):
            rows.append(normalize_row(row, file_path.name, idx, aliases))
    return rows, issues


def load_xlsx(file_path: Path, aliases: Dict[str, List[str]], required_fields: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    issues: List[Dict[str, Any]] = []
    try:
        from openpyxl import load_workbook
    except Exception:
        issues.append({"type": "missing_dependency", "dependency": "openpyxl", "fonte_arquivo": file_path.name})
        return [], issues

    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active
    data = list(ws.iter_rows(values_only=True))
    if not data:
        return [], issues

    headers = normalize_headers([str(h or "") for h in data[0]])
    missing_headers = validate_required_headers(headers, aliases, required_fields)
    if missing_headers:
        issues.append({"type": "missing_required_headers", "missing_headers": missing_headers, "fonte_arquivo": file_path.name})
        return [], issues

    rows = []
    for i, values in enumerate(data[1:], start=2):
        row_raw = {headers[c]: values[c] for c in range(min(len(headers), len(values)))}
        rows.append(normalize_row(row_raw, file_path.name, i, aliases))
    return rows, issues
