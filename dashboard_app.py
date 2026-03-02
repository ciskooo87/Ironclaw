#!/usr/bin/env python3
import json
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent
PROJECTS_DIR = ROOT / "projects"

st.set_page_config(page_title="Ironcore Dashboard", layout="wide")
st.title("IRONCORE — Dashboard Operacional")

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

col1, col2, col3, col4 = st.columns(4)
col1.metric("Riscos", summary.get("risks", 0))
col2.metric("Críticos/Altos", summary.get("critical_high", 0))
col3.metric("Issues", summary.get("issues", 0))
col4.metric("Run ID", summary.get("run_id", "-"))

st.subheader("Clusters")
if clusters:
    st.dataframe(clusters, use_container_width=True)
else:
    st.info("Sem clusters")

st.subheader("Top riscos")
st.dataframe(top_risks[:20], use_container_width=True)

st.subheader("Riscos-mãe (recorrência)")
st.dataframe(risk_mothers[:20], use_container_width=True)

st.subheader("SLA Alerts")
if sla_path.exists():
    sla = json.loads(sla_path.read_text(encoding="utf-8"))
    st.write(f"Thresholds: {sla.get('thresholds', {})}")
    st.dataframe(sla.get("alerts", []), use_container_width=True)
else:
    st.info("Sem sla_alerts.json")

st.subheader("Ledger status")
if ledger_path.exists():
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    risks = list(ledger.get("risks", {}).values())
    status_count = {}
    for r in risks:
        status_count[r.get("status", "unknown")] = status_count.get(r.get("status", "unknown"), 0) + 1
    st.json(status_count)
    st.dataframe(risks[:30], use_container_width=True)
else:
    st.info("Sem risk_ledger.json")

st.subheader("Daily brief")
if brief_path.exists():
    st.markdown(brief_path.read_text(encoding="utf-8"))
else:
    st.info("Sem daily_brief.md")
