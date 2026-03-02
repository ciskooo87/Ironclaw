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
      :root {
        --bg:#070b14;
        --panel:#0f172a;
        --panel-2:#111827;
        --border:#243041;
        --text:#e5e7eb;
        --muted:#9ca3af;
        --accent:#22d3ee;
        --accent2:#a78bfa;
        --ok:#34d399;
        --warn:#f59e0b;
        --bad:#ef4444;
      }
      .stApp {background: radial-gradient(1000px 400px at 5% -5%, #12203d 0%, var(--bg) 55%); color:var(--text);}
      .block-container {padding-top:1rem; max-width: 1400px;}
      .hero {
        background: linear-gradient(135deg, rgba(34,211,238,0.12), rgba(167,139,250,0.12));
        border:1px solid var(--border); border-radius:16px; padding:18px 20px; margin-bottom:14px;
      }
      .hero h1{margin:0;font-size:1.4rem}
      .hero p{margin:.35rem 0 0 0;color:var(--muted)}
      .metric-card {
        background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:10px 12px;
      }
      div[data-testid="stMetric"] {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 10px;
      }
      div[data-testid="stDataFrame"] > div {
        border:1px solid var(--border); border-radius:12px;
      }
      .section-title {font-size:1.05rem; font-weight:700; margin:4px 0 8px 0;}
      .pill {display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid var(--border);font-size:12px;color:var(--muted)}
      .badge-ok{color:var(--ok)} .badge-warn{color:var(--warn)} .badge-bad{color:var(--bad)}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero">
      <h1>⚙️ IRONCORE — Premium Control Center</h1>
      <p>Risk intelligence, SLA tracking, daily decision support and controlled AI execution.</p>
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

run_id = summary.get("run_id", "-")
issues = int(summary.get("issues", 0) or 0)
issues_badge = "badge-ok" if issues == 0 else "badge-warn"

st.markdown(
    f"<span class='pill'>Projeto: <b>{project_id}</b></span> &nbsp; "
    f"<span class='pill'>Run: <b>{run_id}</b></span> &nbsp; "
    f"<span class='pill {issues_badge}'>Issues: <b>{issues}</b></span>",
    unsafe_allow_html=True,
)

k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("Riscos", summary.get("risks", 0))
k2.metric("Críticos/Altos", summary.get("critical_high", 0))
k3.metric("Issues", issues)
k4.metric("Materialidade", summary.get("materiality_min_impact", 0))
k5.metric("Processados", summary.get("processed", 0))

overview_tab, risks_tab, sla_tab, control_tab = st.tabs(["📈 Visão Geral", "🧠 Riscos", "⏱️ SLA & Ledger", "🎛️ Controle"])

with overview_tab:
    c1, c2 = st.columns([1.3, 1])
    with c1:
        st.markdown("<div class='section-title'>Clusters de risco</div>", unsafe_allow_html=True)
        if not cluster_df.empty:
            chart_df = cluster_df[["cluster", "count"]].set_index("cluster")
            st.bar_chart(chart_df, color="#22d3ee")
            st.dataframe(cluster_df, use_container_width=True, hide_index=True)
        else:
            st.info("Sem dados de cluster")

    with c2:
        st.markdown("<div class='section-title'>Status do Ledger</div>", unsafe_allow_html=True)
        if ledger_status:
            status_df = pd.DataFrame([{"status": k, "qtd": v} for k, v in ledger_status.items()]).set_index("status")
            st.bar_chart(status_df, color="#a78bfa")
            st.dataframe(status_df, use_container_width=True)
        else:
            st.info("Ledger ainda não disponível")

    st.markdown("<div class='section-title'>Riscos-mãe (recorrência)</div>", unsafe_allow_html=True)
    if not mother_df.empty:
        st.dataframe(mother_df.head(20), use_container_width=True, hide_index=True)
    else:
        st.info("Sem riscos-mãe")

with risks_tab:
    st.markdown("<div class='section-title'>Top riscos</div>", unsafe_allow_html=True)
    if not risk_df.empty:
        cols = [c for c in ["kpi", "unidade", "score", "level", "valor_atual", "meta", "llm_action_status"] if c in risk_df.columns]
        st.dataframe(risk_df[cols].head(100), use_container_width=True, hide_index=True)

        if "llm_action" in risk_df.columns:
            st.markdown("<div class='section-title'>Prévia IA (Top 3)</div>", unsafe_allow_html=True)
            for _, row in risk_df.head(3).iterrows():
                st.markdown(f"**{row.get('kpi')} / {row.get('unidade')}** — `{row.get('llm_action_status', 'n/a')}`")
                if isinstance(row.get("llm_action"), dict):
                    st.json(row.get("llm_action"))
    else:
        st.info("Sem riscos para mostrar")

with sla_tab:
    st.markdown("<div class='section-title'>Alertas SLA</div>", unsafe_allow_html=True)
    st.caption(f"Thresholds: {sla_payload.get('thresholds', {})}")
    if not sla_df.empty:
        st.dataframe(sla_df, use_container_width=True, hide_index=True)
    else:
        st.success("Sem alertas SLA no momento")

    st.markdown("<div class='section-title'>Ledger (amostra)</div>", unsafe_allow_html=True)
    if not ledger_df.empty:
        cols = [c for c in ["risk_id", "kpi", "unidade", "status", "days_open", "severity_current", "severity_trend"] if c in ledger_df.columns]
        st.dataframe(ledger_df[cols].head(100), use_container_width=True, hide_index=True)
    else:
        st.info("Sem ledger disponível")

    st.markdown("<div class='section-title'>Daily brief</div>", unsafe_allow_html=True)
    if brief_path.exists():
        st.markdown(brief_path.read_text(encoding="utf-8"))

with control_tab:
    st.markdown("<div class='section-title'>Executar análise sob confirmação</div>", unsafe_allow_html=True)
    st.caption("A análise com IA só roda mediante confirmação explícita.")

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
            str(PYTHON_BIN),
            str(RUNNER),
            "--project",
            project_id,
            "--run-id",
            run_label,
            "--llm-enable",
            "--llm-model",
            model,
            "--llm-max-items",
            str(llm_items),
            "--analysis-mode",
            analysis_mode,
            "--fail-on-regression",
        ]

        with st.spinner("Executando análise..."):
            proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)

        if proc.returncode == 0:
            st.success(f"Análise concluída com sucesso. Run: {run_label}")
            with st.expander("Log da execução"):
                st.code(proc.stdout or "(sem stdout)")

            # Quick result preview in the same tab
            try:
                latest = json.loads((base / "outputs" / "comite.json").read_text(encoding="utf-8"))
                s = latest.get("summary", {})
                top = latest.get("top_risks", [])
                llm_ok = sum(1 for r in top if r.get("llm_action_status") == "accepted")
                st.info(
                    f"Resultado carregado: run={s.get('run_id')} | riscos={s.get('risks')} | "
                    f"crit/alt={s.get('critical_high')} | llm accepted(top)={llm_ok}/{len(top)}"
                )
            except Exception:
                st.info("Execução concluída. Vá para as abas 'Riscos' e 'Visão Geral' para ver os dados atualizados.")

            if st.button("🔄 Recarregar dashboard agora"):
                st.rerun()
        else:
            st.error(f"Falha na execução (code={proc.returncode})")
            with st.expander("Detalhes do erro", expanded=True):
                st.code((proc.stdout or "") + "\n" + (proc.stderr or ""))
