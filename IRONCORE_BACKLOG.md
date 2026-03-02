# IRONCORE Backlog de Execução (ordem prática)

## P0 — Começar a rodar
- [ ] Criar estrutura `sources/ processed/ outputs/ evals/ config/ logs/`
- [ ] Definir formato padrão de fato (`facts.jsonl`)
- [ ] Implementar leitor CSV/XLSX
- [ ] Implementar normalização mínima
- [ ] Gerar `risk_register.json` via regras simples
- [ ] Gerar `comite.md` e `comite.json`

## P1 — Confiabilidade
- [ ] Adicionar validações por campo obrigatório
- [ ] Registrar falhas e inconsistências por linha
- [ ] Versionar `risk_rules.yaml`
- [ ] Incluir hash/assinatura de execução no log

## P2 — Qualidade contínua
- [ ] Criar `evals/questions.json`
- [ ] Rodar avaliação de cobertura de evidência
- [ ] Comparar saída atual vs baseline
- [ ] Bloquear regressão crítica

## P3 — Expansão
- [ ] Ingestão de PDF
- [ ] OCR opcional
- [ ] Templates por indústria
- [ ] Multi-cliente / white-label

## Critérios de aceite do MVP
- [ ] Processa lote de entrada sem erro fatal
- [ ] Produz saída de comitê completa
- [ ] Cada risco tem evidência citável
- [ ] 5W2H sai com dono sugerido
- [ ] Log da execução disponível
