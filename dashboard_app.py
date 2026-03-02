#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent
PROJECTS_DIR = ROOT / "projects"
PYTHON_BIN = ROOT / ".venv" / "bin" / "python"
RUNNER = ROOT / "ironcore_mvp.py"

st.set_page_config(page_title="IRONCORE Command Center", page_icon="⚙️", layout="wide")

st.markdown(
    """
    <style>
      :root {
        --bg:#060a16;
        --panel:#0b1224;
        --panel-soft:#0e1730;
        --line:#1e2d4a;
        --text:#dbeafe;
        --muted:#7f93b8;
        --cyan:#22d3ee;
        --blue:#60a5fa;
        --violet:#a78bfa;
        --ok:#34d399;
        --warn:#f59e0b;
        --bad:#ef4444;
      }

      .stApp {
        background: radial-gradient(1200px 400px at 20% -20%, #122347 0%, var(--bg) 55%);
        color: var(--text);
      }
      .block-container {padding-top: .8rem; max-width: 1500px;}

      .topbar {
        background: linear-gradient(135deg, rgba(34,211,238,.08), rgba(96,165,250,.08));
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px 16px;
        margin-bottom: 12px;
      }
      .topbar h1 {margin: 0; font-size: 1.25rem; letter-spacing: .2px;}
      .topbar p {margin: .2rem 0 0; color: var(--muted);}

      div[data-testid="stMetric"] {
        background: linear-gradient(180deg, var(--panel), var(--panel-soft));
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px;
      }

      div[data-testid="stDataFrame"] > div {
        border: 1px solid var(--line);
        border-radius: 12px;
      }

      .section {
        background: linear-gradient(180deg, var(--panel), var(--panel-soft));
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px;
      }

      .decision {
        border: 1px solid var(--line);
        border-left: 4px solid var(--cyan);
        background: rgba(10,18,36,.85);
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
      }

      .tag {
        display:inline-block;
        border:1px solid var(--line);
        color:var(--muted);
        border-radius:999px;
        font-size:12px;
        padding:2px 10px;
        margin-right:6px;
      }

      .left-nav {
        background: linear-gradient(180deg, #0a1226, #0a1020);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px;
      }
      .left-nav .title {font-weight:700; margin-bottom:8px; color:var(--blue);}
      .left-nav .item {padding:8px 10px; border-radius:8px; margin-bottom:4px; color:var(--muted); border:1px solid transparent;}
      .left-nav .item.active {background: rgba(34,211,238,.10); color:var(--text); border-color: rgba(34,211,238,.35);}

      .status-ok {color: var(--ok);} .status-warn {color: var(--warn);} .status-bad {color: var(--bad);} 
    </style>
    """,
    unsafe_allow_html=True,
)

projects = sorted([p.name for p in PROJECTS_DIR.iterdir() if p.is_dir()]) if PROJECTS_DIR.exists() else []
if not projects:
    st.warning("Nenhum projeto encontrado")
    st.stop()

project_id = st.sidebar.selectbox("Projeto", projects, index=projects.index("teste") if "teste" in projects else 0)
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

run_id = summary.get("run_id", "-")
mode = summary.get("analysis_mode", "-")
processed = int(summary.get("processed", 0) or 0)

st.markdown(
    """
    <div class='topbar'>
      <h1>IronCore · Dashboard Premium</h1>
      <p>Command Center para risco, execução e governança contínua.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    f"<span class='tag'>Projeto: <b>{project_id}</b></span>"
    f"<span class='tag'>Run: <b>{run_id}</b></span>"
    f"<span class='tag'>Modo: <b>{mode}</b></span>",
    unsafe_allow_html=True,
)

k1, k2, k3, k4, k5, k6 = st.columns(6)
k1.metric("Riscos", summary.get("risks", 0))
k2.metric("Críticos/Altos", summary.get("critical_high", 0))
k3.metric("Novos dados", "SIM" if processed > 0 else "NÃO", delta=processed if processed > 0 else 0)
k4.metric("Issues", summary.get("issues", 0))
k5.metric("SLA Alerts", len(alerts))
k6.metric("Materialidade", summary.get("materiality_min_impact", 0))

left, right = st.columns([0.18, 0.82])
with left:
    st.markdown(
        """
        <div class='left-nav'>
          <div class='title'>Command Center</div>
          <div class='item active'>Cockpit Executivo</div>
          <div class='item'>Decisões do Dia</div>
          <div class='item'>Controle de Execução</div>
          <div class='item'>Forense</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with right:
    cockpit, decisions, control, forensic = st.tabs(["Cockpit Executivo", "Decisões do Dia", "Controle", "Forense"])

    with cockpit:
        c1, c2 = st.columns([1.15, 1])
        with c1:
            st.markdown("#### Pressão por frente")
            if not cluster_df.empty and {"cluster", "critical_high"}.issubset(set(cluster_df.columns)):
                st.bar_chart(cluster_df[["cluster", "critical_high"]].set_index("cluster"), color="#22d3ee")
            else:
                st.info("Sem dados de cluster")

        with c2:
            st.markdown("#### Top riscos críticos")
            if not risk_df.empty:
                cols = [c for c in ["kpi", "unidade", "score", "level", "llm_action_status"] if c in risk_df.columns]
                st.dataframe(risk_df[cols].head(8), use_container_width=True, hide_index=True)
            else:
                st.info("Sem riscos")

        s1, s2 = st.columns(2)
        with s1:
            st.markdown("#### Status operacional")
            if ledger_status:
                df = pd.DataFrame([{"status": k, "qtd": v} for k, v in ledger_status.items()]).set_index("status")
                st.bar_chart(df, color="#60a5fa")
            else:
                st.info("Ledger indisponível")

        with s2:
            st.markdown("#### SLA e alerta")
            if len(alerts) == 0:
                st.success("Sem alertas SLA ativos")
            else:
                st.error(f"{len(alerts)} alertas SLA ativos")
            st.caption(f"Thresholds: {sla_payload.get('thresholds', {})}")

    with decisions:
        st.markdown("#### Decisões recomendadas (24h)")
        if not cluster_df.empty and "critical_high" in cluster_df.columns:
            top = cluster_df.sort_values("critical_high", ascending=False).head(3)
            for _, row in top.iterrows():
                st.markdown(
                    f"<div class='decision'><b>{row.get('cluster')}</b><br/>"
                    f"Priorizar esta frente no comitê de hoje. "
                    f"Críticos/altos: <b>{int(row.get('critical_high', 0))}</b>"
                    f" · Impacto estimado: <b>{row.get('impacto_estimado_cluster', 0)}</b>.</div>",
                    unsafe_allow_html=True,
                )
        else:
            st.info("Sem recomendações")

        if brief_path.exists():
            with st.expander("Daily brief", expanded=False):
                st.markdown(brief_path.read_text(encoding="utf-8"))

    with control:
        st.markdown("#### Executar análise (com confirmação explícita)")
        a, b = st.columns(2)
        with a:
            llm_items = st.slider("Qtd riscos para IA", 1, 50, 10)
            model = st.text_input("Modelo", value="deepseek-chat")
            analysis_mode = st.selectbox("Modo de análise", ["since_last", "daily", "full"], index=0)
        with b:
            run_label = st.text_input("Run label", value=f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
            confirm = st.checkbox("Confirmo execução da análise IA")

        if st.button("▶ Executar", type="primary", disabled=not confirm):
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
            with st.spinner("Executando..."):
                proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
            if proc.returncode == 0:
                st.success(f"Execução concluída: {run_label}")
                st.info("Clique em recarregar para ver os dados atualizados")
                if st.button("🔄 Recarregar agora"):
                    st.rerun()
            else:
                st.error(f"Falha ({proc.returncode})")
                st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))

    with forensic:
        st.markdown("#### Dados detalhados")
        st.dataframe(cluster_df, use_container_width=True, hide_index=True)
        st.dataframe(risk_df.head(30), use_container_width=True, hide_index=True)
        st.json(sla_payload)
