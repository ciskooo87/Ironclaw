# IRONCORE MVP Plan (v0)

## Objetivo do MVP
Entregar um fluxo ponta-a-ponta que transforme dados brutos de turnaround em uma saída de comitê com evidência rastreável, sem retrabalho manual.

## Definição de pronto (MVP)
O MVP é considerado pronto quando, para um lote de entrada, ele gerar automaticamente:
1. **Resumo executivo** (curto e objetivo)
2. **Top riscos priorizados** (impacto x urgência)
3. **Plano de ação 5W2H** com dono sugerido
4. **Evidências citáveis** por risco/ação (origem do dado/fato)
5. **Registro de execução** (log + versão de regras)

## Escopo funcional (v0)

### Entrada
- Planilhas operacionais/financeiras (CSV/XLSX)
- PDFs de suporte (opcional no v0.1, obrigatório no v0.2)

### Pipeline
1. **Ingestão**
   - Ler arquivos da pasta `sources/`
   - Validar formato mínimo
2. **Normalização**
   - Converter para estrutura tabular comum
   - Registrar inconsistências em `processed/issues.json`
3. **Extração de fatos**
   - Gerar `facts.jsonl` com fatos objetivos + metadados de origem
4. **Regras de risco**
   - Rodar regras versionadas (`risk_rules.yaml`)
   - Calcular prioridade (impacto x urgência)
5. **Geração de saída**
   - Produzir saída de comitê em Markdown/JSON
6. **Avaliação básica**
   - Checklist de qualidade e cobertura de evidência

### Saídas
- `outputs/comite.md`
- `outputs/comite.json`
- `processed/facts.jsonl`
- `processed/risk_register.json`
- `logs/run-<timestamp>.log`

## Contrato de dados v0 (mínimo)

### Estrutura de pastas
- `sources/` arquivos de entrada
- `processed/` dados normalizados + fatos
- `outputs/` entregáveis para comitê
- `evals/` resultados de avaliação
- `config/` regras, templates e parâmetros

### Campos mínimos esperados (v0)
- `periodo` (data ou mês)
- `unidade` (área, operação ou BU)
- `kpi` (nome do indicador)
- `valor_atual`
- `meta` (se existir)
- `variacao` (se existir)
- `observacao` (opcional)
- `fonte_arquivo`

## Modelo de priorização (v0)
- **Impacto:** 1-5
- **Urgência:** 1-5
- **Prioridade final:** `impacto * urgencia`
- **Faixas sugeridas:**
  - 16-25: Crítico
  - 9-15: Alto
  - 4-8: Médio
  - 1-3: Baixo

## Entregas por fase (curtas)

### Fase 1 — Base funcional
- Estrutura de pastas
- Parser CSV/XLSX
- Normalização mínima
- Fatos + evidência de origem

### Fase 2 — Inteligência de risco
- Regras versionadas
- Priorização automática
- Registro de risco consolidado

### Fase 3 — Saída de comitê
- Resumo executivo
- Tabela de riscos
- 5W2H gerado
- Export JSON + Markdown

### Fase 4 — Qualidade e regressão
- Evals simples
- Baseline de qualidade
- Alertas de regressão

## Riscos atuais
1. Ausência de amostra real da planilha base (bloqueio parcial de mapeamento)
2. Ambiguidade de campos por cliente/setor
3. PDFs podem exigir OCR (fora do v0 imediato)

## Próximo passo imediato
Assim que chegar a planilha base real, mapear colunas em <30 min e ajustar o contrato de dados v0 sem quebrar o pipeline.
