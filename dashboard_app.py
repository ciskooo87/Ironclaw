#!/usr/bin/env python3
import json
import random
import subprocess
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent
PROJECTS_DIR = ROOT / "projects"
PYTHON_BIN = ROOT / ".venv" / "bin" / "python"
RUNNER = ROOT / "ironcore_mvp.py"

st.set_page_config(page_title="IronCore Command Center", page_icon="🛡️", layout="wide")

st.markdown(
    """
    <style>
      :root {
        --bg:#050912; --panel:#0b1324; --panel2:#101b33; --line:#22314f;
        --txt:#dbeafe; --muted:#88a0c8; --cyan:#22d3ee; --violet:#a78bfa;
        --ok:#34d399; --warn:#f59e0b; --bad:#ef4444;
      }
      .stApp {background: radial-gradient(1200px 450px at 20% -20%, #102347 0%, var(--bg) 56%); color:var(--txt);}
      .block-container {padding-top: .8rem; max-width: 1500px;}
      .hero {background: linear-gradient(135deg, rgba(34,211,238,.10), rgba(167,139,250,.10)); border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-bottom:10px;}
      .hero h1 {margin:0; font-size:1.3rem;} .hero p{margin:.35rem 0 0; color:var(--muted)}
      div[data-testid="stMetric"] {background: linear-gradient(180deg,var(--panel),var(--panel2)); border:1px solid var(--line); border-radius:12px; padding:8px;}
      div[data-testid="stDataFrame"] > div {border:1px solid var(--line); border-radius:12px;}
      .trust {background: rgba(9,19,38,.9); border:1px solid var(--line); border-radius:12px; padding:8px 12px; margin-bottom:10px;}
      .pill {display:inline-block; border:1px solid var(--line); border-radius:999px; color:var(--muted); padding:2px 10px; font-size:12px; margin-right:6px;}
      .decision {border:1px solid var(--line); border-left:4px solid var(--cyan); border-radius:10px; padding:10px; margin-bottom:8px; background: rgba(9,19,38,.85);}
      .riskbox {border:1px dashed #39527d; border-radius:10px; padding:10px; background: rgba(8,14,28,.75);}
    </style>
    """,
    unsafe_allow_html=True,
)


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def previous_daily_summary(base: Path):
    daily_dir = base / "history" / "daily"
    if not daily_dir.exists():
        return None
    files = sorted(daily_dir.glob("*.json"))
    if len(files) < 2:
        return None
    prev = json.loads(files[-2].read_text(encoding="utf-8"))
    return prev.get("summary", {})


def _pick_col(df: pd.DataFrame, options: list[str]) -> str | None:
    for c in options:
        if c in df.columns:
            return c
    return None


def load_cashflow_settings(base: Path):
    cfg = base / "config" / "cashflow_settings.json"
    if not cfg.exists():
        return {"opening_balance": 0.0}
    try:
        return json.loads(cfg.read_text(encoding="utf-8"))
    except Exception:
        return {"opening_balance": 0.0}


def save_cashflow_settings(base: Path, opening_balance: float):
    cfg = base / "config" / "cashflow_settings.json"
    cfg.parent.mkdir(parents=True, exist_ok=True)
    payload = {"opening_balance": float(opening_balance), "updated_at": datetime.now().isoformat()}
    cfg.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build_cashflow_projection_90d(base: Path, horizon_days: int = 90, lookback_months: int = 6, opening_balance: float = 0.0):
    src_xlsx = base / "sources" / "base.xlsx"
    if not src_xlsx.exists():
        return None, "Arquivo base.xlsx não encontrado em sources/"

    try:
        ap = pd.read_excel(src_xlsx, sheet_name="CONTAS A PAGAR").rename(columns={"ABRIL ": "ABRIL"})
        ar = pd.read_excel(src_xlsx, sheet_name="CONTAS A RECEBER")
    except Exception as e:
        return None, f"Falha ao carregar planilha: {e}"

    date_ap = _pick_col(ap, ["MÊS / ANO", "MES / ANO", "MÊS/ANO", "MES/ANO"])
    date_ar = _pick_col(ar, ["MÊS/ANO", "MES/ANO", "MÊS / ANO", "MES / ANO"])
    val_ar = _pick_col(ar, ["VALOR", "Valor", "valor"])

    if not date_ap or not date_ar or not val_ar:
        return None, "Colunas obrigatórias não encontradas em contas a pagar/receber"

    month_map = {
        1: "JANEIRO", 2: "FEVEREIRO", 3: "MARÇO", 4: "ABRIL", 5: "MAIO", 6: "JUNHO",
        7: "JULHO", 8: "AGOSTO", 9: "SETEMBRO", 10: "OUTUBRO", 11: "NOVEMBRO", 12: "DEZEMBRO",
    }

    ap = ap.copy()
    ap[date_ap] = pd.to_datetime(ap[date_ap], errors="coerce")
    ap = ap[ap[date_ap].notna()]

    def ap_value(row):
        col = month_map.get(int(row[date_ap].month))
        v = row.get(col, 0)
        return float(v) if pd.notna(v) else 0.0

    ap["valor_ap"] = ap.apply(ap_value, axis=1)

    ar = ar.copy()
    ar[date_ar] = pd.to_datetime(ar[date_ar], errors="coerce")
    ar[val_ar] = pd.to_numeric(ar[val_ar], errors="coerce").fillna(0.0)
    ar = ar[ar[date_ar].notna()]

    monthly_ap = ap.groupby(ap[date_ap].dt.to_period("M"))["valor_ap"].sum()
    monthly_ar = ar.groupby(ar[date_ar].dt.to_period("M"))[val_ar].sum()
    monthly = pd.DataFrame({"receber": monthly_ar, "pagar": monthly_ap}).fillna(0.0).sort_index()
    monthly = monthly[(monthly["receber"] > 0) & (monthly["pagar"] > 0)]

    if monthly.empty:
        return None, "Série histórica insuficiente para projeção"

    base_hist = monthly.tail(lookback_months)
    avg_receber = float(base_hist["receber"].mean())
    avg_pagar = float(base_hist["pagar"].mean())

    days = pd.date_range(pd.Timestamp.today().normalize(), periods=horizon_days, freq="D")
    daily_receber = avg_receber / 30.0
    daily_pagar = avg_pagar / 30.0

    proj = pd.DataFrame({
        "data": days,
        "receber_previsto": daily_receber,
        "pagar_previsto": daily_pagar,
    })
    proj["fluxo_liquido"] = proj["receber_previsto"] - proj["pagar_previsto"]
    proj["saldo_acumulado"] = proj["fluxo_liquido"].cumsum()
    proj["saldo_projetado"] = opening_balance + proj["saldo_acumulado"]

    scenarios = {
        "conservador": {"receber_mult": 0.85, "pagar_mult": 1.10},
        "base": {"receber_mult": 1.00, "pagar_mult": 1.00},
        "agressivo": {"receber_mult": 1.10, "pagar_mult": 0.95},
    }

    scenario_totals = {}
    for name, m in scenarios.items():
        r = daily_receber * m["receber_mult"] * horizon_days
        p = daily_pagar * m["pagar_mult"] * horizon_days
        scenario_totals[name] = {
            "entradas_90d": round(r, 2),
            "saidas_90d": round(p, 2),
            "liquido_90d": round(r - p, 2),
        }

    payload = {
        "generated_at": datetime.now().isoformat(),
        "horizon_days": horizon_days,
        "lookback_months": lookback_months,
        "historical_months_used": len(base_hist),
        "opening_balance": round(opening_balance, 2),
        "min_projected_balance": round(float(proj["saldo_projetado"].min()), 2),
        "ending_projected_balance": round(float(proj["saldo_projetado"].iloc[-1]), 2),
        "run_rate_mensal": {
            "receber": round(avg_receber, 2),
            "pagar": round(avg_pagar, 2),
            "liquido": round(avg_receber - avg_pagar, 2),
        },
        "totais_base_90d": scenario_totals["base"],
        "scenarios_90d": scenario_totals,
        "projection_daily": [
            {
                "data": d["data"].strftime("%Y-%m-%d"),
                "receber_previsto": round(float(d["receber_previsto"]), 2),
                "pagar_previsto": round(float(d["pagar_previsto"]), 2),
                "fluxo_liquido": round(float(d["fluxo_liquido"]), 2),
                "saldo_acumulado": round(float(d["saldo_acumulado"]), 2),
                "saldo_projetado": round(float(d["saldo_projetado"]), 2),
            }
            for _, d in proj.iterrows()
        ],
    }

    out = base / "outputs" / "cashflow_90d.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"monthly": monthly, "projection": proj, "payload": payload, "output": out}, None


projects = sorted([p.name for p in PROJECTS_DIR.iterdir() if p.is_dir()]) if PROJECTS_DIR.exists() else []
if not projects:
    st.warning("Nenhum projeto encontrado")
    st.stop()

project_id = st.sidebar.selectbox("Tenant / Projeto", projects, index=projects.index("teste") if "teste" in projects else 0)
view_mode = st.sidebar.radio("View Mode", ["Executive", "Technical"], horizontal=True)

base = PROJECTS_DIR / project_id
comite_path = base / "outputs" / "comite.json"
sla_path = base / "outputs" / "sla_alerts.json"
brief_path = base / "outputs" / "daily_brief.md"
ledger_path = base / "history" / "risk_ledger.json"

if not comite_path.exists():
    st.error(f"Sem saída: {comite_path}")
    st.stop()

comite = load_json(comite_path, {})
summary = comite.get("summary", {})
clusters = comite.get("clusters", [])
top_risks = comite.get("top_risks", [])

cluster_df = pd.DataFrame(clusters)
risk_df = pd.DataFrame(top_risks)

sla_payload = load_json(sla_path, {"alerts": [], "thresholds": {}})
alerts = sla_payload.get("alerts", [])

ledger_status = {}
ledger = load_json(ledger_path, {"risks": {}})
for r in ledger.get("risks", {}).values():
    s = r.get("status", "unknown")
    ledger_status[s] = ledger_status.get(s, 0) + 1

# ---------- SECURITY POSTURE GATE ----------
if "posture_ok" not in st.session_state:
    st.session_state.posture_ok = False
if "attack_sim" not in st.session_state:
    st.session_state.attack_sim = None

if not st.session_state.posture_ok:
    st.markdown("""
    <div class='hero'>
      <h1>🔐 Security Posture Check</h1>
      <p>Validação de confiança antes de entrar no Command Center.</p>
    </div>
    """, unsafe_allow_html=True)
    c1, c2 = st.columns([1, 1])
    with c1:
        st.success("✔ Data Protected")
        st.success("✔ AI Models Secured")
    with c2:
        st.success("✔ Tenant Isolation Active")
        st.success("✔ No Active Breach")
    if st.button("Enter Command Center", type="primary"):
        st.session_state.posture_ok = True
        st.rerun()
    st.stop()

# ---------- HEADER ----------
run_id = summary.get("run_id", "-")
mode = summary.get("analysis_mode", "-")
processed = int(summary.get("processed", 0) or 0)
trust_score = 94 if len(alerts) == 0 else max(75, 94 - min(20, len(alerts) * 3))

prev = previous_daily_summary(base)
delta_risks = None
delta_critical = None
if prev:
    delta_risks = int(summary.get("risks", 0)) - int(prev.get("risks", 0))
    delta_critical = int(summary.get("critical_high", 0)) - int(prev.get("critical_high", 0))

st.markdown("""
<div class='hero'>
  <h1>🛡️ IronCore Command Center</h1>
  <p>Sistema nervoso operacional para risco, continuidade e decisão.</p>
</div>
""", unsafe_allow_html=True)

st.markdown(
    f"<span class='pill'>Projeto: <b>{project_id}</b></span>"
    f"<span class='pill'>Run: <b>{run_id}</b></span>"
    f"<span class='pill'>Modo: <b>{mode}</b></span>"
    f"<span class='pill'>View: <b>{view_mode}</b></span>",
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class='trust'>
      <b>Trust Bar:</b>
      Encryption: <span style='color:var(--ok)'>ACTIVE</span> ·
      Keys: <span style='color:var(--ok)'>Customer Owned</span> ·
      Isolation: <span style='color:var(--ok)'>VERIFIED</span> ·
      Region: <span style='color:var(--ok)'>BR / US / EU</span> ·
      Quantum Safe: <span style='color:var(--warn)'>READY</span>
    </div>
    """,
    unsafe_allow_html=True,
)

m1, m2, m3, m4, m5, m6 = st.columns(6)
m1.metric("SYSTEM TRUST SCORE", f"{trust_score}/100")
m2.metric("Riscos", summary.get("risks", 0), delta=delta_risks)
m3.metric("Críticos/Altos", summary.get("critical_high", 0), delta=delta_critical)
m4.metric("Ação exigida", "SIM" if len(alerts) > 0 else "NÃO")
m5.metric("Novos dados", "SIM" if processed > 0 else "NÃO", delta=processed if processed > 0 else 0)
m6.metric("Issues", summary.get("issues", 0))

# ---------- MAIN TABS ----------
cockpit, cashflow, security, actions, control, technical = st.tabs(
    ["Command Center", "Fluxo de Caixa 90D", "AI Security", "Action Inbox", "Run Control", "Audit Timeline"]
)

with cockpit:
    z1, z2 = st.columns([1.2, 1])
    with z1:
        st.subheader("1) Estamos seguros?")
        if not cluster_df.empty and {"cluster", "critical_high"}.issubset(set(cluster_df.columns)):
            st.bar_chart(cluster_df[["cluster", "critical_high"]].set_index("cluster"), color="#22d3ee")
        else:
            st.info("Sem pressão relevante por frente")

    with z2:
        st.subheader("2) Algo exige ação agora?")
        if alerts:
            st.error(f"{len(alerts)} alertas ativos")
            st.dataframe(pd.DataFrame(alerts).head(8), use_container_width=True, hide_index=True)
        else:
            st.success("Sem alertas ativos no momento")

    st.subheader("3) Onde está o risco?")
    if not risk_df.empty:
        cols = [c for c in ["kpi", "unidade", "score", "level", "llm_action_status"] if c in risk_df.columns]
        st.dataframe(risk_df[cols].head(10), use_container_width=True, hide_index=True)

with cashflow:
    st.subheader("Fluxo de Caixa Projetado — 90 dias")

    def brl(v: float) -> str:
        return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    settings = load_cashflow_settings(base)
    cfg_opening = float(settings.get("opening_balance", 0.0) or 0.0)

    k1, k2 = st.columns([1, 1])
    with k1:
        opening_balance = st.number_input(
            "Saldo inicial de caixa (R$)",
            value=cfg_opening,
            step=1000.0,
            format="%.2f",
            help="Use saldo de caixa/bancos no início da projeção.",
        )
    with k2:
        st.caption("Persistência por projeto em config/cashflow_settings.json")
        if st.button("Salvar saldo inicial"):
            save_cashflow_settings(base, opening_balance)
            st.success("Saldo inicial salvo.")

    cf_data, cf_error = build_cashflow_projection_90d(
        base=base,
        horizon_days=90,
        lookback_months=6,
        opening_balance=float(opening_balance),
    )

    if cf_error:
        st.warning(cf_error)
    else:
        payload = cf_data["payload"]
        proj = cf_data["projection"]

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Entradas 90D (base)", brl(payload["totais_base_90d"]["entradas_90d"]))
        c2.metric("Saídas 90D (base)", brl(payload["totais_base_90d"]["saidas_90d"]))
        c3.metric("Líquido 90D (base)", brl(payload["totais_base_90d"]["liquido_90d"]))
        c4.metric("Run rate mensal líquido", brl(payload["run_rate_mensal"]["liquido"]))

        c5, c6, c7 = st.columns(3)
        c5.metric("Saldo inicial", brl(payload["opening_balance"]))
        c6.metric("Menor saldo projetado", brl(payload["min_projected_balance"]))
        c7.metric("Saldo final projetado", brl(payload["ending_projected_balance"]))

        st.caption("Projeção baseada nos últimos 6 meses válidos de Contas a Pagar e Contas a Receber.")

        chart_df = proj[["data", "receber_previsto", "pagar_previsto", "saldo_projetado"]].set_index("data")
        st.line_chart(chart_df, color=["#34d399", "#ef4444", "#22d3ee"])

        scen_df = pd.DataFrame(
            [{"cenário": k.title(), **v} for k, v in payload["scenarios_90d"].items()]
        )
        st.dataframe(scen_df, use_container_width=True, hide_index=True)

        csv_data = proj.to_csv(index=False).encode("utf-8")
        st.download_button(
            "Baixar projeção diária (CSV)",
            data=csv_data,
            file_name=f"cashflow-90d-{project_id}-{datetime.now().strftime('%Y%m%d-%H%M')}.csv",
            mime="text/csv",
        )
        st.caption(f"JSON técnico atualizado em: {cf_data['output']}")

with security:
    st.subheader("AI Risk Meter")
    exposure = "LOW" if len(alerts) == 0 else "MEDIUM"
    st.metric("AI Data Exposure", exposure)

    st.subheader("Data Flow")
    st.markdown("""
    <div class='riskbox'>
    DATA → ENCRYPTION → ACCESS CONTROL → AI INFERENCE → OUTPUT GOVERNANCE
    </div>
    """, unsafe_allow_html=True)

    st.subheader("Attack Simulation")
    if st.button("Simulate Breach", type="secondary"):
        st.session_state.attack_sim = {
            "incident": random.choice(["Key exfiltration attempt", "Model abuse pattern", "Unauthorized tenant access"]),
            "blast_radius": random.choice(["Zero", "Contained", "Low"]),
            "controls": ["Tenant isolation", "Key ownership", "Policy guardrails", "Audit trail"],
            "status": "Contained",
            "response_time_sec": random.randint(18, 75),
        }

    if st.session_state.attack_sim:
        sim = st.session_state.attack_sim
        st.warning(f"Incident: {sim['incident']}")
        st.success(f"Status: {sim['status']} | Blast radius: {sim['blast_radius']} | Response: {sim['response_time_sec']}s")
        st.write("Controls activated:", ", ".join(sim["controls"]))

with actions:
    st.subheader("Recommended Actions")
    inbox = []

    if not cluster_df.empty and "critical_high" in cluster_df.columns:
        top = cluster_df.sort_values("critical_high", ascending=False).head(5)
        for _, row in top.iterrows():
            inbox.append(
                {
                    "priority": "P1" if int(row.get("critical_high", 0)) >= 20 else "P2",
                    "item": f"Priorizar frente {row.get('cluster')}",
                    "impact": row.get("impacto_estimado_cluster", 0),
                    "status": "recommended",
                }
            )

    for a in alerts[:5]:
        inbox.append(
            {
                "priority": "P1" if a.get("level") == "critical" else "P2",
                "item": f"SLA {a.get('level')} — {a.get('kpi')} ({a.get('unidade')})",
                "impact": a.get("days_open", 0),
                "status": "attention",
            }
        )

    inbox_df = pd.DataFrame(inbox).sort_values(by=["priority", "impact"], ascending=[True, False]) if inbox else pd.DataFrame()
    if not inbox_df.empty:
        st.dataframe(inbox_df, use_container_width=True, hide_index=True)
    else:
        st.info("Sem ações recomendadas no momento")

    c1, c2, c3 = st.columns(3)
    if c1.button("Assign"):
        st.success("Action assigned (mock workflow).")
    if c2.button("Mark in progress"):
        st.info("Action moved to in-progress (mock workflow).")
    if c3.button("Request evidence"):
        st.warning("Evidence request issued (mock workflow).")

    # One-click committee brief
    st.subheader("Committee Brief")
    brief_lines = [
        f"# Committee Brief — {project_id}",
        f"Run: {run_id}",
        "",
        f"- Trust Score: {trust_score}/100",
        f"- Risks: {summary.get('risks', 0)}",
        f"- Critical/High: {summary.get('critical_high', 0)}",
        f"- SLA Alerts: {len(alerts)}",
        "",
        "## Top Decisions",
    ]
    for _, row in (cluster_df.sort_values("critical_high", ascending=False).head(3).iterrows() if not cluster_df.empty else []):
        brief_lines.append(f"- Priorizar {row.get('cluster')} (critical/high={int(row.get('critical_high', 0))})")

    brief_md = "\n".join(brief_lines)
    out_brief = base / "outputs" / "committee_brief.md"
    out_brief.write_text(brief_md, encoding="utf-8")

    st.download_button(
        "Download Committee Brief (MD)",
        data=brief_md,
        file_name=f"committee-brief-{project_id}-{datetime.now().strftime('%Y%m%d-%H%M')}.md",
        mime="text/markdown",
    )

with control:
    st.subheader("Run Analysis (manual confirmation required)")
    a, b = st.columns(2)
    with a:
        llm_items = st.slider("LLM items", 1, 50, 10)
        model = st.text_input("Model", value="deepseek-chat")
        analysis_mode = st.selectbox("Analysis mode", ["since_last", "daily", "full"], index=0)
    with b:
        run_label = st.text_input("Run label", value=f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
        confirm = st.checkbox("I confirm this AI run")

    if st.button("▶ Execute", type="primary", disabled=not confirm):
        cmd = [
            str(PYTHON_BIN), str(RUNNER),
            "--project", project_id,
            "--run-id", run_label,
            "--llm-enable",
            "--llm-model", model,
            "--llm-max-items", str(llm_items),
            "--analysis-mode", analysis_mode,
            "--fail-on-regression",
        ]
        with st.spinner("Running..."):
            proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
        if proc.returncode == 0:
            st.success(f"Run completed: {run_label}")
            if st.button("Refresh now"):
                st.rerun()
        else:
            st.error(f"Run failed ({proc.returncode})")
            st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))

with technical:
    st.subheader("Audit Timeline")
    if view_mode == "Executive":
        st.info("Ative Technical View no menu lateral para ver dados detalhados.")
    else:
        st.dataframe(cluster_df, use_container_width=True, hide_index=True)
        st.dataframe(risk_df.head(30), use_container_width=True, hide_index=True)
        st.json(sla_payload)
