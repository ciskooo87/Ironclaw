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

st.set_page_config(page_title="IRONCORE War Room", page_icon="⚙️", layout="wide")

st.markdown(
    """
    <style>
      :root {
        --bg:#060b14; --panel:#0f172a; --border:#233245; --text:#e5e7eb;
        --muted:#9ca3af; --cyan:#22d3ee; --violet:#a78bfa; --ok:#34d399; --warn:#f59e0b; --bad:#ef4444;
      }
      .stApp {background: radial-gradient(1200px 450px at 0% -10%, #162440 0%, var(--bg) 55%); color:var(--text);}
      .block-container {padding-top:1rem; max-width:1450px;}
      .hero {background:linear-gradient(135deg, rgba(34,211,238,.16), rgba(167,139,250,.16)); border:1px solid var(--border); border-radius:16px; padding:18px; margin-bottom:14px;}
      .hero h1{margin:0;font-size:1.45rem;} .hero p{margin:.35rem 0 0;color:var(--muted)}
      .panel {background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:12px;}
      div[data-testid="stMetric"] {background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:10px;}
      .tag {display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid var(--border);color:var(--muted);font-size:12px;}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero">
      <h1>⚙️ IRONCORE — War Room (Alta Direção)</h1>
      <p>Foco em decisão: riscos críticos, tendência, execução e próximos comandos.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

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

cluster_df = pd.DataFrame(clusters)
risk_df = pd.DataFrame(top_risks)

sla_payload = {"alerts": [], "thresholds": {}}
if sla_path.exists():
    sla_payload = json.loads(sla_path.read_text(encoding="utf-8"))
sla_alerts = sla_payload.get("alerts", [])

ledger_status = {}
ledger_items = []
if ledger_path.exists():
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    ledger_items = list(ledger.get("risks", {}).values())
    for r in ledger_items:
        s = r.get("status", "unknown")
        ledger_status[s] = ledger_status.get(s, 0) + 1

processed = int(summary.get("processed", 0) or 0)
new_data_flag = "SIM" if processed > 0 else "NÃO"
new_data_delta = processed if processed > 0 else 0

run_id = summary.get("run_id", "-")
mode = summary.get("analysis_mode", "-")
st.markdown(
    f"<span class='tag'>Projeto: <b>{project_id}</b></span> &nbsp; "
    f"<span class='tag'>Run: <b>{run_id}</b></span> &nbsp; "
    f"<span class='tag'>Modo: <b>{mode}</b></span>",
    unsafe_allow_html=True,
)

m1, m2, m3, m4, m5, m6 = st.columns(6)
m1.metric("Riscos", summary.get("risks", 0))
m2.metric("Críticos/Altos", summary.get("critical_high", 0))
m3.metric("SLA Alerts", len(sla_alerts))
m4.metric("Novos dados", new_data_flag, delta=new_data_delta)
m5.metric("Issues", summary.get("issues", 0))
m6.metric("Materialidade", summary.get("materiality_min_impact", 0))

cockpit_tab, actions_tab, control_tab, forensic_tab = st.tabs([
    "🎯 Cockpit Executivo", "⚡ Plano de Ação", "🎛️ Controle", "🧾 Forense"
])

with cockpit_tab:
    left, right = st.columns([1.2, 1])

    with left:
        st.subheader("Pressão por frente")
        if not cluster_df.empty:
            view = cluster_df[["cluster", "critical_high"]].set_index("cluster")
            st.bar_chart(view, color="#22d3ee")
        else:
            st.info("Sem clusters")

        st.subheader("Top 5 riscos críticos")
        if not risk_df.empty:
            cols = [c for c in ["kpi", "unidade", "score", "level", "llm_action_status"] if c in risk_df.columns]
            st.dataframe(risk_df[cols].head(5), use_container_width=True, hide_index=True)

    with right:
        st.subheader("Situação operacional")
        if ledger_status:
            status_df = pd.DataFrame([{"status": k, "qtd": v} for k, v in ledger_status.items()]).set_index("status")
            st.bar_chart(status_df, color="#a78bfa")
        else:
            st.info("Ledger indisponível")

        st.subheader("Leitura executiva")
        if not cluster_df.empty:
            top_cluster = cluster_df.sort_values("critical_high", ascending=False).iloc[0]
            st.warning(
                f"Frente mais pressionada: **{top_cluster['cluster']}** | "
                f"críticos/altos={int(top_cluster['critical_high'])}"
            )
        if len(sla_alerts) == 0:
            st.success("Sem alertas SLA ativos.")
        else:
            st.error(f"{len(sla_alerts)} alertas SLA ativos. Priorizar resposta imediata.")

with actions_tab:
    st.subheader("Comandos recomendados (próximas 24h)")
    if not cluster_df.empty and "top_actions" in cluster_df.columns:
        for _, c in cluster_df.head(4).iterrows():
            st.markdown(f"### {c.get('cluster')} — impacto estimado {c.get('impacto_estimado_cluster', 0)}")
            actions = c.get("top_actions", []) or []
            if actions:
                for a in actions[:3]:
                    st.markdown(
                        f"- **{a.get('priority','P?')}** {a.get('what')}  \\  Dono: {a.get('who')} | Prazo: {a.get('when')} | Impacto: {a.get('impacto_estimado')}"
                    )
            else:
                st.info("Sem ações propostas para esta frente")
    else:
        st.info("Sem ações clusterizadas no momento")

with control_tab:
    st.subheader("Executar análise (com confirmação explícita)")
    c1, c2 = st.columns(2)
    with c1:
        llm_items = st.slider("Qtd. riscos para enriquecimento IA", 1, 50, 10)
        model = st.text_input("Modelo LLM", value="deepseek-chat")
        analysis_mode = st.selectbox("Modo de análise", ["since_last", "daily", "full"], index=0)
    with c2:
        run_label = st.text_input("Label da execução", value=f"manual-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
        confirm = st.checkbox("Confirmo execução da análise IA para este projeto")

    run_btn = st.button("▶️ Rodar análise agora", type="primary", disabled=not confirm)

    if run_btn and confirm:
        cmd = [
            str(PYTHON_BIN), str(RUNNER), "--project", project_id,
            "--run-id", run_label,
            "--llm-enable", "--llm-model", model,
            "--llm-max-items", str(llm_items),
            "--analysis-mode", analysis_mode,
            "--fail-on-regression",
        ]
        with st.spinner("Executando análise..."):
            proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
        if proc.returncode == 0:
            st.success(f"Análise concluída com sucesso. Run: {run_label}")
            try:
                latest = json.loads((base / "outputs" / "comite.json").read_text(encoding="utf-8"))
                s = latest.get("summary", {})
                st.info(
                    f"run={s.get('run_id')} | mode={s.get('analysis_mode')} | riscos={s.get('risks')} | "
                    f"crit/alt={s.get('critical_high')} | novos_dados={'SIM' if int(s.get('processed',0))>0 else 'NÃO'}"
                )
            except Exception:
                pass
            if st.button("🔄 Recarregar dashboard"):
                st.rerun()
        else:
            st.error(f"Falha na execução (code={proc.returncode})")
            st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))

with forensic_tab:
    st.subheader("Detalhamento técnico (sob demanda)")
    with st.expander("Top riscos (raw)"):
        st.dataframe(risk_df, use_container_width=True, hide_index=True)
    with st.expander("Clusters (raw)"):
        st.dataframe(cluster_df, use_container_width=True, hide_index=True)
    with st.expander("SLA alerts (raw)"):
        st.json(sla_payload)
    if brief_path.exists():
        with st.expander("Daily brief"):
            st.markdown(brief_path.read_text(encoding="utf-8"))
