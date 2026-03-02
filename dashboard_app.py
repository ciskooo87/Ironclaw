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

st.set_page_config(page_title="IRONCORE Dashboard", page_icon="⚙️", layout="wide")

st.markdown(
    """
    <style>
      .block-container {padding-top: 1.2rem;}
      .kpi-card {background:#111827;padding:14px;border-radius:12px;border:1px solid #1f2937;}
      .small-muted {color:#9ca3af;font-size:0.85rem;}
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("⚙️ IRONCORE — Control Center")
st.caption("Turnaround intelligence with project isolation, risk lifecycle and SLA monitoring.")

projects = sorted([p.name for p in PROJECTS_DIR.iterdir() if p.is_dir()]) if PROJECTS_DIR.exists() else []
if not projects:
    st.warning("Nenhum projeto encontrado em ./projects")
    st.stop()

project_id = st.sidebar.selectbox("Projeto", projects, index=projects.index("teste") if "teste" in projects else 0)
base = PROJECTS_DIR / project_id

comite_path = base / "outputs" / "comite.json"
ledger_path = base / "history" / "risk_ledger.json"
sla_path = base / "outputs" / "sla_alerts.json"
brief_path = base / "outputs" / "daily_brief.md"

if not comite_path.exists():
    st.error(f"Arquivo não encontrado: {comite_path}")
    st.stop()

comite = json.loads(comite_path.read_text(encoding="utf-8"))
summary = comite.get("summary", {})
clusters = comite.get("clusters", [])
top_risks = comite.get("top_risks", [])
risk_mothers = comite.get("risk_mothers", [])

cluster_df = pd.DataFrame(clusters)
risk_df = pd.DataFrame(top_risks)
mother_df = pd.DataFrame(risk_mothers)

sla_payload = {"alerts": [], "thresholds": {}}
if sla_path.exists():
    sla_payload = json.loads(sla_path.read_text(encoding="utf-8"))
sla_df = pd.DataFrame(sla_payload.get("alerts", []))

ledger_status = {}
ledger_df = pd.DataFrame()
if ledger_path.exists():
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    ledger_items = list(ledger.get("risks", {}).values())
    ledger_df = pd.DataFrame(ledger_items)
    for r in ledger_items:
        s = r.get("status", "unknown")
        ledger_status[s] = ledger_status.get(s, 0) + 1

# KPI strip
k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("Riscos", summary.get("risks", 0))
k2.metric("Críticos/Altos", summary.get("critical_high", 0))
k3.metric("Issues", summary.get("issues", 0))
k4.metric("Run", summary.get("run_id", "-"))
k5.metric("Materialidade", summary.get("materiality_min_impact", 0))

# Tabs
overview_tab, risks_tab, sla_tab, control_tab = st.tabs(["Visão Geral", "Riscos", "SLA & Ledger", "Controle"])

with overview_tab:
    c1, c2 = st.columns([1.3, 1])
    with c1:
        st.subheader("Clusters de risco")
        if not cluster_df.empty:
            chart_df = cluster_df[["cluster", "count"]].set_index("cluster")
            st.bar_chart(chart_df)
            st.dataframe(cluster_df, use_container_width=True, hide_index=True)
        else:
            st.info("Sem dados de cluster")

    with c2:
        st.subheader("Status do Ledger")
        if ledger_status:
            status_df = pd.DataFrame([{"status": k, "qtd": v} for k, v in ledger_status.items()]).set_index("status")
            st.bar_chart(status_df)
            st.dataframe(status_df, use_container_width=True)
        else:
            st.info("Ledger ainda não disponível")

    st.subheader("Riscos-mãe (recorrência)")
    if not mother_df.empty:
        st.dataframe(mother_df.head(20), use_container_width=True, hide_index=True)
    else:
        st.info("Sem riscos-mãe")

with risks_tab:
    st.subheader("Top riscos")
    if not risk_df.empty:
        cols = [c for c in ["kpi", "unidade", "score", "level", "valor_atual", "meta", "llm_action_status"] if c in risk_df.columns]
        st.dataframe(risk_df[cols].head(100), use_container_width=True, hide_index=True)

        if "llm_action" in risk_df.columns:
            st.markdown("**Prévia de recomendações da IA (top 3):**")
            for _, row in risk_df.head(3).iterrows():
                st.markdown(f"- **{row.get('kpi')} / {row.get('unidade')}** → `{row.get('llm_action_status', 'n/a')}`")
                if isinstance(row.get("llm_action"), dict):
                    st.json(row.get("llm_action"))
    else:
        st.info("Sem riscos para mostrar")

with sla_tab:
    st.subheader("Alertas SLA")
    st.caption(f"Thresholds: {sla_payload.get('thresholds', {})}")
    if not sla_df.empty:
        st.dataframe(sla_df, use_container_width=True, hide_index=True)
    else:
        st.success("Sem alertas SLA no momento")

    st.subheader("Ledger (amostra)")
    if not ledger_df.empty:
        cols = [c for c in ["risk_id", "kpi", "unidade", "status", "days_open", "severity_current", "severity_trend"] if c in ledger_df.columns]
        st.dataframe(ledger_df[cols].head(100), use_container_width=True, hide_index=True)
    else:
        st.info("Sem ledger disponível")

    st.subheader("Daily brief")
    if brief_path.exists():
        st.markdown(brief_path.read_text(encoding="utf-8"))

with control_tab:
    st.subheader("Executar análise")
    st.markdown("A análise com IA só roda mediante confirmação explícita.")

    llm_items = st.slider("Quantidade de riscos para enriquecimento IA", 1, 50, 10)
    model = st.text_input("Modelo LLM", value="deepseek-chat")

    confirm = st.checkbox("Confirmo execução da análise IA para este projeto")
    run_btn = st.button("▶️ Rodar análise agora", type="primary", disabled=not confirm)

    if run_btn and confirm:
        run_id = f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        cmd = [
            str(PYTHON_BIN),
            str(RUNNER),
            "--project",
            project_id,
            "--run-id",
            run_id,
            "--llm-enable",
            "--llm-model",
            model,
            "--llm-max-items",
            str(llm_items),
            "--fail-on-regression",
        ]

        with st.spinner("Executando análise..."):
            proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)

        if proc.returncode == 0:
            st.success(f"Análise concluída com sucesso. Run: {run_id}")
            st.code(proc.stdout or "(sem stdout)")
            st.info("Atualize a página para carregar os dados novos.")
        else:
            st.error(f"Falha na execução (code={proc.returncode})")
            st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))
