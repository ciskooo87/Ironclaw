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

st.set_page_config(page_title="IRONCORE Boardroom", page_icon="⚙️", layout="wide")

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

ledger_status = {}
if ledger_path.exists():
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    for r in ledger.get("risks", {}).values():
        s = r.get("status", "unknown")
        ledger_status[s] = ledger_status.get(s, 0) + 1

run_id = summary.get("run_id", "-")
mode = summary.get("analysis_mode", "-")
processed = int(summary.get("processed", 0) or 0)
new_data = "SIM" if processed > 0 else "NÃO"

st.title("IRONCORE — Executive Boardroom")
st.caption("Painel executivo de risco, decisão e execução")

meta1, meta2, meta3 = st.columns([1, 1, 2])
meta1.info(f"**Projeto:** {project_id}")
meta2.info(f"**Run:** {run_id}")
meta3.info(f"**Modo:** {mode}")

c1, c2, c3, c4, c5, c6 = st.columns(6)
c1.metric("Riscos", summary.get("risks", 0))
c2.metric("Críticos/Altos", summary.get("critical_high", 0))
c3.metric("Novos dados", new_data, delta=processed if processed > 0 else 0)
c4.metric("Issues", summary.get("issues", 0))
c5.metric("Alertas SLA", len(sla_payload.get("alerts", [])))
c6.metric("Materialidade", summary.get("materiality_min_impact", 0))

cockpit, decisions, control, detail = st.tabs(["Cockpit", "Decisões", "Controle", "Detalhes"])

with cockpit:
    left, right = st.columns([1.2, 1])

    with left:
        st.subheader("Pressão por frente")
        if not cluster_df.empty and all(c in cluster_df.columns for c in ["cluster", "critical_high"]):
            st.bar_chart(cluster_df[["cluster", "critical_high"]].set_index("cluster"))
        else:
            st.info("Sem dados de cluster.")

    with right:
        st.subheader("Top riscos críticos")
        if not risk_df.empty:
            cols = [c for c in ["kpi", "unidade", "score", "level"] if c in risk_df.columns]
            st.dataframe(risk_df[cols].head(8), use_container_width=True, hide_index=True)
        else:
            st.info("Sem riscos na rodada.")

    st.subheader("Situação operacional")
    if ledger_status:
        status_df = pd.DataFrame([{"status": k, "qtd": v} for k, v in ledger_status.items()])
        st.dataframe(status_df, use_container_width=True, hide_index=True)

with decisions:
    st.subheader("Decisões recomendadas para hoje")
    if not cluster_df.empty and "critical_high" in cluster_df.columns:
        top = cluster_df.sort_values("critical_high", ascending=False).head(3)
        for _, r in top.iterrows():
            st.markdown(
                f"- **{r.get('cluster')}**: priorizar frente com **{int(r.get('critical_high', 0))}** riscos críticos/altos"
            )
    else:
        st.info("Sem recomendações nesta rodada.")

    st.subheader("Daily brief")
    if brief_path.exists():
        st.markdown(brief_path.read_text(encoding="utf-8"))

with control:
    st.subheader("Rodar análise (com confirmação)")
    col1, col2 = st.columns(2)
    with col1:
        llm_items = st.slider("Qtd riscos para IA", 1, 50, 10)
        model = st.text_input("Modelo", value="deepseek-chat")
        analysis_mode = st.selectbox("Modo", ["since_last", "daily", "full"], index=0)
    with col2:
        run_label = st.text_input("Run label", value=f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
        confirm = st.checkbox("Confirmo execução")

    run = st.button("Executar análise", type="primary", disabled=not confirm)

    if run and confirm:
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
            if st.button("Recarregar painel"):
                st.rerun()
        else:
            st.error(f"Falha ({proc.returncode})")
            st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))

with detail:
    st.subheader("Clusters")
    st.dataframe(cluster_df, use_container_width=True, hide_index=True)

    st.subheader("Top riscos (raw)")
    st.dataframe(risk_df.head(30), use_container_width=True, hide_index=True)

    st.subheader("SLA alerts")
    st.json(sla_payload)
