from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pandas as pd


DATE_CANDIDATES = ["data", "date", "dt", "data_pagamento", "payment_date"]
AMOUNT_CANDIDATES = ["valor", "amount", "valor_pago", "value"]
DESC_CANDIDATES = ["historico", "descricao", "descrição", "fornecedor", "description"]
TYPE_CANDIDATES = ["tipo", "type", "dc", "debito_credito"]
BALANCE_CANDIDATES = ["saldo", "balance", "saldo_final", "running_balance"]

PAY_DATE_CANDIDATES = ["data_pagamento", "payment_date", "data", "date", "vencimento"]
PAY_AMOUNT_CANDIDATES = ["valor", "amount", "valor_pago", "vl_pagamento"]
PAY_DESC_CANDIDATES = ["fornecedor", "historico", "descricao", "descrição", "documento"]


def _pick(df: pd.DataFrame, candidates: list[str]) -> str | None:
    cols = {c.lower().strip(): c for c in df.columns}
    for c in candidates:
        if c in cols:
            return cols[c]
    return None


def _load_any(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    if path.suffix.lower() in {".xlsx", ".xls", ".xlsm"}:
        return pd.read_excel(path)
    raise ValueError(f"Formato não suportado: {path.suffix}")


def _to_num(s: pd.Series) -> pd.Series:
    if s.dtype == object:
        s = s.astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    return pd.to_numeric(s, errors="coerce").fillna(0.0)


def reconcile_previous_day(
    *,
    project_base: Path,
    statement_path: Path,
    payable_path: Path,
    reference_date: dt.date | None = None,
    tolerance: float = 0.01,
) -> dict:
    if reference_date is None:
        reference_date = dt.date.today()
    target_day = reference_date - dt.timedelta(days=1)

    bank = _load_any(statement_path).copy()
    pay = _load_any(payable_path).copy()

    dcol = _pick(bank, DATE_CANDIDATES)
    vcol = _pick(bank, AMOUNT_CANDIDATES)
    tcol = _pick(bank, TYPE_CANDIDATES)
    xcol = _pick(bank, DESC_CANDIDATES)
    bcol = _pick(bank, BALANCE_CANDIDATES)

    pdcol = _pick(pay, PAY_DATE_CANDIDATES)
    pvcol = _pick(pay, PAY_AMOUNT_CANDIDATES)
    pxcol = _pick(pay, PAY_DESC_CANDIDATES)

    if not dcol or not vcol:
        raise ValueError("Extrato sem colunas mínimas (data/valor)")
    if not pdcol or not pvcol:
        raise ValueError("Contas a pagar sem colunas mínimas (data/valor)")

    bank[dcol] = pd.to_datetime(bank[dcol], errors="coerce").dt.date
    bank[vcol] = _to_num(bank[vcol])

    if tcol:
        t = bank[tcol].astype(str).str.lower()
        debit_mask = t.str.contains("deb") | t.str.contains("saida") | t.str.contains("saída")
        credit_mask = t.str.contains("cred") | t.str.contains("entrada")
        bank.loc[debit_mask, vcol] = -bank.loc[debit_mask, vcol].abs()
        bank.loc[credit_mask, vcol] = bank.loc[credit_mask, vcol].abs()

    day_bank = bank[bank[dcol] == target_day].copy()
    day_payments = day_bank[day_bank[vcol] < 0].copy()
    day_payments["valor_abs"] = day_payments[vcol].abs()

    pay[pdcol] = pd.to_datetime(pay[pdcol], errors="coerce").dt.date
    pay[pvcol] = _to_num(pay[pvcol]).abs()
    day_ap = pay[pay[pdcol] == target_day].copy()

    matches = []
    used_bank_idx: set[int] = set()

    for i, prow in day_ap.iterrows():
        val = float(prow[pvcol])
        # 1) match exato por valor
        cand = day_payments[(day_payments["valor_abs"] - val).abs() <= tolerance]
        cand = cand[~cand.index.isin(used_bank_idx)]

        chosen = None
        score = "amount"
        if not cand.empty:
            if pxcol and xcol:
                ptxt = str(prow.get(pxcol, "")).lower().strip()
                if ptxt:
                    c2 = cand[cand[xcol].astype(str).str.lower().str.contains(ptxt[:12], regex=False)]
                    if not c2.empty:
                        cand = c2
                        score = "amount+text"
            chosen = cand.iloc[0]

        if chosen is not None:
            used_bank_idx.add(int(chosen.name))
            matches.append(
                {
                    "ap_index": int(i),
                    "bank_index": int(chosen.name),
                    "data": str(target_day),
                    "valor_ap": round(val, 2),
                    "valor_extrato": round(float(chosen[vcol]), 2),
                    "criterio": score,
                    "descricao_ap": str(prow.get(pxcol, "")) if pxcol else "",
                    "descricao_extrato": str(chosen.get(xcol, "")) if xcol else "",
                }
            )

    matched_ap_idx = {m["ap_index"] for m in matches}
    matched_bank_idx = {m["bank_index"] for m in matches}

    ap_unmatched = day_ap.loc[~day_ap.index.isin(matched_ap_idx)]
    bank_unmatched = day_payments.loc[~day_payments.index.isin(matched_bank_idx)]

    closing_balance = None
    if bcol and not day_bank.empty:
        bs = _to_num(day_bank[bcol])
        closing_balance = float(bs.iloc[-1])

    # fallback: último saldo conhecido do extrato inteiro
    if closing_balance is None and bcol and not bank.empty:
        bs = _to_num(bank[bcol])
        closing_balance = float(bs.dropna().iloc[-1]) if not bs.dropna().empty else None

    summary = {
        "reference_date": str(reference_date),
        "reconciled_day": str(target_day),
        "totals": {
            "ap_expected_count": int(len(day_ap)),
            "ap_expected_amount": round(float(day_ap[pvcol].sum()) if not day_ap.empty else 0.0, 2),
            "bank_payments_count": int(len(day_payments)),
            "bank_payments_amount": round(float(day_payments["valor_abs"].sum()) if not day_payments.empty else 0.0, 2),
            "matched_count": int(len(matches)),
            "matched_amount": round(sum(m["valor_ap"] for m in matches), 2),
            "ap_unmatched_count": int(len(ap_unmatched)),
            "bank_unmatched_count": int(len(bank_unmatched)),
        },
        "closing_balance": round(closing_balance, 2) if closing_balance is not None else None,
        "files": {
            "statement": str(statement_path),
            "payable": str(payable_path),
        },
        "matches": matches,
        "ap_unmatched": ap_unmatched[[c for c in [pdcol, pvcol, pxcol] if c]].to_dict(orient="records"),
        "bank_unmatched": bank_unmatched[[c for c in [dcol, vcol, xcol] if c]].to_dict(orient="records"),
    }

    out_dir = project_base / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"reconciliation_{target_day.strftime('%Y%m%d')}.json"
    out_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    # Apropriar saldo para o módulo de fluxo de caixa
    if closing_balance is not None:
        cfg_dir = project_base / "config"
        cfg_dir.mkdir(parents=True, exist_ok=True)
        cfg_file = cfg_dir / "cashflow_settings.json"
        current = {}
        if cfg_file.exists():
            try:
                current = json.loads(cfg_file.read_text(encoding="utf-8"))
            except Exception:
                current = {}
        current.update(
            {
                "opening_balance": float(closing_balance),
                "opening_balance_source": "bank_reconciliation",
                "opening_balance_updated_at": dt.datetime.now().isoformat(),
            }
        )
        cfg_file.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "output": str(out_file),
        "closing_balance_applied": closing_balance,
        "summary": summary["totals"],
    }
