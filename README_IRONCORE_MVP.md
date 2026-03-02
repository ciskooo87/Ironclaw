# README — IRONCORE MVP (v0)

## Como rodar

```bash
python3 ironcore_mvp.py
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

Avaliação contínua + baseline:
```bash
# primeira execução (cria baseline)
python3 ironcore_mvp.py --run-id dia1 --update-baseline

# próximas execuções (compara com baseline)
python3 ironcore_mvp.py --run-id dia2 --fail-on-regression
```

## Estrutura
- `src/ironcore/` código modular (ingestion, config, risk_engine, reporting, evals, pipeline, cli)
- `sources/` entradas (.csv e .xlsx)
- `processed/facts.jsonl` fatos normalizados com evidência
- `processed/risk_register.json` riscos priorizados
- `processed/issues.json` inconsistências de dados
- `outputs/comite.md` saída pronta para comitê
- `outputs/comite.json` saída estruturada
- `config/risk_rules.yaml` regras de risco versionáveis
- `config/mappings.json` aliases de colunas + campos obrigatórios
- `logs/run-*.log` trilha de execução

## Campos esperados (mínimo)
`periodo, unidade, kpi, valor_atual, meta`

## Observações
- XLSX requer `openpyxl` instalado no ambiente.
- Se `PyYAML` não estiver disponível, o pipeline usa regras padrão internas.
