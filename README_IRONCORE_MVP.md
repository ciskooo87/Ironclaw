# README — IRONCORE MVP (v0)

## Como rodar

```bash
python3 ironcore_mvp.py
```

Opcional:
```bash
python3 ironcore_mvp.py --max-risks 5
```

## Estrutura
- `sources/` entradas (.csv e .xlsx)
- `processed/facts.jsonl` fatos normalizados com evidência
- `processed/risk_register.json` riscos priorizados
- `processed/issues.json` inconsistências de dados
- `outputs/comite.md` saída pronta para comitê
- `outputs/comite.json` saída estruturada
- `config/risk_rules.yaml` regras de risco versionáveis
- `logs/run-*.log` trilha de execução

## Campos esperados (mínimo)
`periodo, unidade, kpi, valor_atual, meta`

## Observações
- XLSX requer `openpyxl` instalado no ambiente.
- Se `PyYAML` não estiver disponível, o pipeline usa regras padrão internas.
