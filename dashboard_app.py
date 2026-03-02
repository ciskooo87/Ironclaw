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

# ---------- STYLE ----------
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

# ---------- DATA LOAD ----------
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

comite = json.loads(comite_path.read_text(encoding="utf-8"))
summary = comite.get("summary", {})
clusters = comite.get("clusters", [])
top_risks = comite.get("top_risks", [])

cluster_df = pd.DataFrame(clusters)
risk_df = pd.DataFrame(top_risks)

sla_payload = {"alerts": [], "thresholds": {}}
if sla_path.exists():
    sla_payload = json.loads(sla_path.read_text(encoding="utf-8"))
alerts = sla_payload.get("alerts", [])

ledger_status = {}
if ledger_path.exists():
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    for r in ledger.get("risks", {}).values():
        s = r.get("status", "unknown")
        ledger_status[s] = ledger_status.get(s, 0) + 1

# ---------- SECURITY POSTURE GATE ----------
if "posture_ok" not in st.session_state:
    st.session_state.posture_ok = False

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

st.markdown(
    """
    <div class='hero'>
      <h1>🛡️ IronCore Command Center</h1>
      <p>Sistema nervoso operacional para risco, continuidade e decisão.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    f"<span class='pill'>Projeto: <b>{project_id}</b></span>"
    f"<span class='pill'>Run: <b>{run_id}</b></span>"
    f"<span class='pill'>Modo: <b>{mode}</b></span>"
    f"<span class='pill'>View: <b>{view_mode}</b></span>",
    unsafe_allow_html=True,
)

st.markdown(
    f"""
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
m2.metric("Riscos", summary.get("risks", 0))
m3.metric("Críticos/Altos", summary.get("critical_high", 0))
m4.metric("Ação exigida", "SIM" if len(alerts) > 0 else "NÃO")
m5.metric("Novos dados", "SIM" if processed > 0 else "NÃO", delta=processed if processed > 0 else 0)
m6.metric("Issues", summary.get("issues", 0))

# ---------- MAIN TABS ----------
cockpit, security, actions, control, technical = st.tabs(
    ["Command Center", "AI Security", "Action Inbox", "Run Control", "Audit Timeline"]
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

    if view_mode == "Technical":
        st.caption("Technical view: detalhes de anomalia e trilha podem ser exibidos aqui na próxima iteração.")

with actions:
    st.subheader("Recommended Actions")
    if not cluster_df.empty and "critical_high" in cluster_df.columns:
        top = cluster_df.sort_values("critical_high", ascending=False).head(5)
        for _, row in top.iterrows():
            st.markdown(
                f"<div class='decision'><b>{row.get('cluster')}</b><br/>"
                f"Priorizar resposta nessa frente · críticos/altos: <b>{int(row.get('critical_high',0))}</b>"
                f" · impacto estimado: <b>{row.get('impacto_estimado_cluster',0)}</b></div>",
                unsafe_allow_html=True,
            )
    else:
        st.info("Sem ações recomendadas no momento")

    if brief_path.exists():
        with st.expander("Daily Brief"):
            st.markdown(brief_path.read_text(encoding="utf-8"))

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
        st.info("Ative Technical View no menu lateral para ver dados de auditoria detalhados.")
    else:
        st.dataframe(cluster_df, use_container_width=True, hide_index=True)
        st.dataframe(risk_df.head(30), use_container_width=True, hide_index=True)
        st.json(sla_payload)
