import datetime as dt
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _risk_id(r: Dict[str, Any]) -> str:
    raw = f"{r.get('kpi','')}|{r.get('unidade','')}|{r.get('description','')}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _today_str() -> str:
    return dt.date.today().isoformat()


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _load_sla_thresholds(project_base: Path) -> Tuple[int, int]:
    warn_days = 7
    critical_days = 14

    profile_path = project_base / "config" / "risk_profile.yaml"
    if not profile_path.exists():
        return warn_days, critical_days

    try:
        import yaml  # type: ignore

        cfg = yaml.safe_load(profile_path.read_text(encoding="utf-8")) or {}
        warn_days = int(cfg.get("sla_days_open_warning", warn_days))
        critical_days = int(cfg.get("sla_days_open_critical", critical_days))
    except Exception:
        pass

    if critical_days < warn_days:
        critical_days = warn_days
    return warn_days, critical_days


def _load_resolution_updates(project_base: Path) -> Dict[str, Dict[str, Any]]:
    # Manual checklist input by project team
    # file: projects/<id>/config/resolution_updates.json
    path = project_base / "config" / "resolution_updates.json"
    return _load_json(path, {}) if path.exists() else {}


def _resolution_check_ok(update: Dict[str, Any]) -> bool:
    required = ["evidence", "owner", "date", "note"]
    return all(str(update.get(k, "")).strip() != "" for k in required)


def update_risk_history(project_base: Path, summary: Dict[str, Any], risks: List[Dict[str, Any]], clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
    history_dir = project_base / "history"
    daily_dir = history_dir / "daily"
    history_dir.mkdir(parents=True, exist_ok=True)
    daily_dir.mkdir(parents=True, exist_ok=True)

    today = _today_str()
    daily_path = daily_dir / f"{today}.json"
    ledger_path = history_dir / "risk_ledger.json"

    daily_payload = {
        "date": today,
        "summary": summary,
        "clusters": clusters,
        "top_risks": risks[:20],
    }
    daily_path.write_text(json.dumps(daily_payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    ledger = _load_json(ledger_path, {"updated_at": None, "risks": {}})
    existing = ledger.get("risks", {})

    seen_today = set()
    worsened = 0
    improved = 0
    stable = 0

    for r in risks:
        rid = _risk_id(r)
        seen_today.add(rid)
        item = existing.get(rid)
        current_score = int(r.get("score", 0) or 0)

        if not item:
            existing[rid] = {
                "risk_id": rid,
                "kpi": r.get("kpi"),
                "unidade": r.get("unidade"),
                "cluster": None,
                "first_seen": today,
                "last_seen": today,
                "status": "open",
                "severity_current": current_score,
                "severity_previous": current_score,
                "severity_peak": current_score,
                "severity_delta": 0,
                "severity_trend": "stable",
                "occurrences": 1,
                "days_open": 1,
                "owner": r.get("action_5w2h", {}).get("who"),
                "action_plan": r.get("action_5w2h", {}).get("what"),
                "resolution_note": "",
                "resolution_checklist": {"evidence": "", "owner": "", "date": "", "note": ""},
                "evidence_refs": [f"{r.get('evidence',{}).get('source_file')}#L{r.get('evidence',{}).get('line')}"] if r.get("evidence") else [],
            }
            stable += 1
        else:
            prev = int(item.get("severity_current", current_score) or current_score)
            delta = current_score - prev
            trend = "stable"
            if delta > 0:
                trend = "worsened"
                worsened += 1
            elif delta < 0:
                trend = "improved"
                improved += 1
            else:
                stable += 1

            item["last_seen"] = today
            item["status"] = "open" if item.get("status") != "resolved" else "reopened"
            item["severity_previous"] = prev
            item["severity_current"] = current_score
            item["severity_delta"] = delta
            item["severity_trend"] = trend
            item["severity_peak"] = max(int(item.get("severity_peak", 0)), current_score)
            item["occurrences"] = int(item.get("occurrences", 0)) + 1
            item["days_open"] = (dt.date.fromisoformat(today) - dt.date.fromisoformat(item.get("first_seen", today))).days + 1
            if r.get("evidence"):
                ref = f"{r.get('evidence',{}).get('source_file')}#L{r.get('evidence',{}).get('line')}"
                refs = item.get("evidence_refs", [])
                if ref not in refs:
                    refs.append(ref)
                item["evidence_refs"] = refs[-20:]

    resolution_updates = _load_resolution_updates(project_base)

    # aging transitions for unseen risks
    for rid, item in existing.items():
        if rid in seen_today:
            continue
        try:
            days_since_seen = (dt.date.fromisoformat(today) - dt.date.fromisoformat(item.get("last_seen", today))).days
        except Exception:
            days_since_seen = 0

        if days_since_seen >= 30 and item.get("status") in {"open", "monitoring", "reopened", "pending_resolution"}:
            upd = resolution_updates.get(rid, {})
            if _resolution_check_ok(upd):
                item["status"] = "resolved"
                item["resolution_note"] = upd.get("note", "")
                item["resolution_checklist"] = {
                    "evidence": upd.get("evidence", ""),
                    "owner": upd.get("owner", ""),
                    "date": upd.get("date", ""),
                    "note": upd.get("note", ""),
                }
            else:
                item["status"] = "pending_resolution"
                item["resolution_note"] = "Checklist de resolução pendente"
        elif days_since_seen >= 7 and item.get("status") in {"open", "reopened"}:
            item["status"] = "monitoring"

    ledger["updated_at"] = dt.datetime.now().isoformat()
    ledger["risks"] = existing
    ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    warn_days, critical_days = _load_sla_thresholds(project_base)
    alerts: List[Dict[str, Any]] = []
    for v in existing.values():
        if v.get("status") not in {"open", "reopened"}:
            continue
        d = int(v.get("days_open", 0) or 0)
        level = None
        if d >= critical_days:
            level = "critical"
        elif d >= warn_days:
            level = "warning"
        if level:
            alerts.append(
                {
                    "risk_id": v.get("risk_id"),
                    "level": level,
                    "days_open": d,
                    "kpi": v.get("kpi"),
                    "unidade": v.get("unidade"),
                    "status": v.get("status"),
                    "owner": v.get("owner"),
                }
            )

    alerts.sort(key=lambda x: (0 if x["level"] == "critical" else 1, -x["days_open"]))
    (project_base / "outputs" / "sla_alerts.json").write_text(
        json.dumps(
            {
                "generated_at": dt.datetime.now().isoformat(),
                "thresholds": {"warning_days": warn_days, "critical_days": critical_days},
                "alerts": alerts,
            },
            ensure_ascii=False,
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )

    new_count = len([1 for v in existing.values() if v.get("first_seen") == today])
    open_risks = [v for v in existing.values() if v.get("status") in {"open", "reopened"}]
    pending_resolution = [v for v in existing.values() if v.get("status") == "pending_resolution"]
    open_risks.sort(key=lambda x: (x.get("days_open", 0), x.get("severity_current", 0)), reverse=True)

    brief_lines = [
        f"# Daily Brief — {today}",
        "",
        f"- Riscos na rodada: {summary.get('risks', 0)}",
        f"- Novos riscos (aprox): {new_count}",
        f"- Riscos abertos/reabertos: {len(open_risks)}",
        f"- Mudança de severidade: worsened={worsened} | improved={improved} | stable={stable}",
        f"- Pendentes de checklist de resolução: {len(pending_resolution)}",
        f"- SLA warning/critical (dias): {warn_days}/{critical_days}",
        f"- Alertas SLA ativos: {len(alerts)}",
        "",
        "## Top alertas SLA",
    ]
    for a in alerts[:10]:
        brief_lines.append(
            f"- [{a.get('level')}] {a.get('kpi')} | {a.get('unidade')} | days_open={a.get('days_open')} | owner={a.get('owner')}"
        )

    brief_lines.extend(["", "## Pendentes de resolução (checklist)"])
    for r in pending_resolution[:10]:
        brief_lines.append(
            f"- {r.get('kpi')} | {r.get('unidade')} | status={r.get('status')} | last_seen={r.get('last_seen')}"
        )

    brief_lines.extend(["", "## Top abertos por aging + severidade"])
    for r in open_risks[:10]:
        brief_lines.append(
            f"- {r.get('kpi')} | {r.get('unidade')} | status={r.get('status')} | days_open={r.get('days_open')} | score={r.get('severity_current')} | trend={r.get('severity_trend')}"
        )

    (project_base / "outputs" / "daily_brief.md").write_text("\n".join(brief_lines), encoding="utf-8")
    return {"daily_path": str(daily_path), "ledger_path": str(ledger_path), "alerts": len(alerts)}
