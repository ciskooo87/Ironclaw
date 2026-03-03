# README — IRONCORE MVP (v0)

## Como rodar

### 1) Cadastrar projeto (obrigatório)
```bash
python3 ironcore_mvp.py --register-project projeto-alpha --project-name "Projeto Alpha"
```

### 2) Validar regras de risco do projeto
```bash
python3 ironcore_mvp.py --project projeto-alpha --validate-rules
```

### 3) Executar pipeline (sempre com projeto)
```bash
python3 ironcore_mvp.py --project projeto-alpha
```

Opcional (produção/lote):
```bash
python3 ironcore_mvp.py \
  --input-dir ./sources \
  --processed-dir ./processed \
  --output-dir ./outputs \
  --config-dir ./config \
  --log-dir ./logs \
  --run-id 20260302-manha \
  --max-risks 5
```

Falhar execução se houver inconsistências de dados:
```bash
python3 ironcore_mvp.py --fail-on-issues
```

Ativar recomendações com LLM (DeepSeek):
```bash
python3 ironcore_mvp.py --project projeto-alpha --llm-enable --llm-model deepseek-chat --llm-max-items 10
```

Modo incremental (somente novos dados):
```bash
python3 ironcore_mvp.py --project projeto-alpha --analysis-mode since_last
# opções: since_last | daily | full
```

Conciliação bancária D-1 (extrato x contas a pagar detalhado):
```bash
python3 ironcore_mvp.py \
  --project projeto-alpha \
  --reconcile-bank \
  --statement-file ./projects/projeto-alpha/sources/extrato_bancario.csv \
  --payable-file ./projects/projeto-alpha/sources/contas_pagar_detalhado.csv
```
Opcional: `--reference-date YYYY-MM-DD` (concilia dia anterior dessa data)

Automação diária por projeto (script):
```bash
./scripts/run_project_daily.sh projeto-alpha
```

Dashboard local (Streamlit):
```bash
.venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run dashboard_app.py --server.port 8501 --server.address 0.0.0.0
```

Avaliação contínua + baseline:
```bash
# primeira execução (cria baseline)
python3 ironcore_mvp.py --run-id dia1 --update-baseline

# próximas execuções (compara com baseline)
python3 ironcore_mvp.py --run-id dia2 --fail-on-regression
```

## Estrutura
- `src/ironcore/` código modular (ingestion, config, risk_engine, reporting, evals, history, pipeline, cli)
- `sources/` entradas (.csv e .xlsx)
- `processed/facts.jsonl` fatos normalizados com evidência
- `processed/risk_register.json` riscos priorizados
- `processed/issues.json` inconsistências de dados
- `outputs/comite.md` saída pronta para comitê
- `outputs/comite.json` saída estruturada
- `outputs/daily_brief.md` resumo diário de acompanhamento
- `outputs/sla_alerts.json` alertas de SLA (por projeto)
- `history/daily/YYYY-MM-DD.json` snapshots diários
- `history/risk_ledger.json` ciclo de vida dos riscos (open/monitoring/resolved/reopened)
- `history/checkpoint.json` último período processado (modo incremental)
- `config/risk_profile.yaml` thresholds de materialidade e SLA por projeto
- `config/resolution_updates.json` checklist manual para permitir status `resolved`
- `config/risk_rules.yaml` regras de risco versionáveis
- `config/mappings.json` aliases de colunas + campos obrigatórios
- `logs/run-*.log` trilha de execução

## Campos esperados (mínimo)
`periodo, unidade, kpi, valor_atual, meta`

## Observações
- XLSX requer `openpyxl` instalado no ambiente.
- Se `PyYAML` não estiver disponível, o pipeline usa regras padrão internas.
