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

st.markdown(
    """
    <style>
      :root {--bg:#f6f8fb;--card:#ffffff;--text:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#0ea5e9;--ok:#16a34a;--warn:#d97706;--bad:#dc2626;}
      .stApp {background:var(--bg); color:var(--text);} .block-container {padding-top:1rem; max-width:1380px;}
      .hero {background:linear-gradient(135deg,#ffffff,#f8fbff); border:1px solid var(--line); border-radius:14px; padding:18px; margin-bottom:12px;}
      .hero h1{margin:0; font-size:1.42rem;} .hero p{margin:.35rem 0 0; color:var(--muted)}
      div[data-testid="stMetric"] {background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px;}
      .decision {background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; margin:8px 0;}
      .tag {display:inline-block;border:1px solid var(--line); padding:2px 10px; border-radius:999px; color:var(--muted); font-size:12px;}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown("""
<div class='hero'>
  <h1>IRONCORE — Executive Boardroom</h1>
  <p>Uma página para decisão: risco, direção, ações e execução.</p>
</div>
""", unsafe_allow_html=True)

projects = sorted([p.name for p in PROJECTS_DIR.iterdir() if p.is_dir()]) if PROJECTS_DIR.exists() else []
if not projects:
    st.warning("Nenhum projeto encontrado")
    st.stop()

project_id = st.sidebar.selectbox("Projeto", projects, index=projects.index("teste") if "teste" in projects else 0)
base = PROJECTS_DIR / project_id

comite_path = base / "outputs" / "comite.json"
if not comite_path.exists():
    st.error(f"Sem saída: {comite_path}")
    st.stop()

comite = json.loads(comite_path.read_text(encoding="utf-8"))
summary = comite.get("summary", {})
clusters = comite.get("clusters", [])
top_risks = comite.get("top_risks", [])

cluster_df = pd.DataFrame(clusters)
risk_df = pd.DataFrame(top_risks)

run_id = summary.get("run_id", "-")
mode = summary.get("analysis_mode", "-")
processed = int(summary.get("processed", 0) or 0)
st.markdown(f"<span class='tag'>Projeto: <b>{project_id}</b></span> &nbsp; <span class='tag'>Run: <b>{run_id}</b></span> &nbsp; <span class='tag'>Modo: <b>{mode}</b></span>", unsafe_allow_html=True)

m1,m2,m3,m4,m5 = st.columns(5)
m1.metric("Riscos", summary.get("risks",0))
m2.metric("Críticos/Altos", summary.get("critical_high",0))
m3.metric("Novos dados", "SIM" if processed>0 else "NÃO", delta=processed if processed>0 else 0)
m4.metric("Issues", summary.get("issues",0))
m5.metric("Materialidade", summary.get("materiality_min_impact",0))

cockpit,decisions,control,details = st.tabs(["Cockpit", "Decisões", "Controle", "Detalhes"])

with cockpit:
    c1,c2 = st.columns([1.2,1])
    with c1:
        st.subheader("Pressão por frente")
        if not cluster_df.empty:
            st.bar_chart(cluster_df[["cluster","critical_high"]].set_index("cluster"), color="#0ea5e9")
    with c2:
        st.subheader("Top riscos críticos")
        if not risk_df.empty:
            cols=[c for c in ["kpi","unidade","score","level"] if c in risk_df.columns]
            st.dataframe(risk_df[cols].head(5), use_container_width=True, hide_index=True)

with decisions:
    st.subheader("3 decisões recomendadas para hoje")
    top_clusters = cluster_df.sort_values("critical_high", ascending=False).head(3) if not cluster_df.empty else pd.DataFrame()
    if not top_clusters.empty:
        for _, row in top_clusters.iterrows():
            st.markdown(
                f"<div class='decision'><b>{row.get('cluster')}</b><br/>"
                f"Priorizar comitê nesta frente. Críticos/altos: <b>{int(row.get('critical_high',0))}</b> | "
                f"Impacto estimado: <b>{row.get('impacto_estimado_cluster',0)}</b>.</div>",
                unsafe_allow_html=True,
            )
    else:
        st.info("Sem recomendações no momento")

with control:
    st.subheader("Rodar nova análise (com confirmação)")
    col1,col2 = st.columns(2)
    with col1:
        llm_items = st.slider("Qtd riscos IA", 1, 50, 10)
        model = st.text_input("Modelo", value="deepseek-chat")
        analysis_mode = st.selectbox("Modo", ["since_last", "daily", "full"], index=0)
    with col2:
        run_label = st.text_input("Run label", value=f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
        confirm = st.checkbox("Confirmo execução")
    if st.button("Executar", type="primary", disabled=not confirm):
        cmd=[str(PYTHON_BIN),str(RUNNER),"--project",project_id,"--run-id",run_label,"--llm-enable","--llm-model",model,"--llm-max-items",str(llm_items),"--analysis-mode",analysis_mode,"--fail-on-regression"]
        proc=subprocess.run(cmd,cwd=str(ROOT),capture_output=True,text=True)
        if proc.returncode==0:
            st.success("Execução concluída")
            if st.button("Recarregar agora"):
                st.rerun()
        else:
            st.error(f"Falha {proc.returncode}")
            st.code((proc.stdout or "")+"\n"+(proc.stderr or ""))

with details:
    st.subheader("Dados detalhados")
    st.dataframe(cluster_df, use_container_width=True, hide_index=True)
    st.dataframe(risk_df.head(30), use_container_width=True, hide_index=True)
