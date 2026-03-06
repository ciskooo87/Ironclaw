# IRONCORE SOP v1.1

Status: **IMPLEMENTADO (documental)**  
Escopo: implementação, operação diária e fechamento  
Princípios: **sem evidência, sem conclusão** · **risco crítico escala no mesmo dia** · **ação com impacto negativo exige confirmação prévia**

---

## 0) Governança padrão (vale para todas as fases)

### 0.1 Status de etapa
- Não iniciado
- Em execução
- Aguardando validação
- Concluído
- Bloqueado

### 0.2 Campos mínimos por etapa
- Entrada obrigatória
- Saída esperada
- SLA/Prazo
- Evidência de conclusão
- Responsável execução
- Responsável aprovação

### 0.3 Critérios globais
- Etapa só avança com **evidência registrada**.
- Divergência de dados críticos: registrar bloqueio e escalar.
- Toda decisão operacional precisa de trilha (data/hora, autor, motivo, impacto).

---

## 1) IMPLEMENTAÇÃO (inicial + revisão trimestral)

### 1.1 Cadastro
**Objetivo:** cadastrar empresa e estrutura base.

- Entrada obrigatória: dados cadastrais completos, plano de contas, fornecedores classificados.
- Responsável execução: Admin.
- Aprovador: Admin.
- Saída esperada: cadastro ativo e consistente.
- SLA/Prazo: início do projeto (D0).
- Evidência: checklist de cadastro + log de validação.

**Checklist de execução**
1. Cadastrar dados da empresa.
2. Cadastrar plano de contas.
3. Classificar fornecedores por conta.
4. Validar campos obrigatórios.
5. Publicar status “Concluído”.

---

### 1.2 Riscos
**Objetivo:** mapear e priorizar riscos iniciais.

- Entrada obrigatória: relato do projeto + contexto financeiro/operacional.
- Responsável execução: Admin.
- Aprovador: Core (Admin + responsável de negócio).
- Saída esperada: matriz de riscos priorizada com plano de ação.
- SLA/Prazo: D0–D2.
- Evidência: matriz de riscos versionada.

**Checklist de execução**
1. Consolidar relato de projeto.
2. Identificar riscos (financeiro, operacional, dados, compliance).
3. Classificar impacto/probabilidade.
4. Definir dono e mitigação por risco.
5. Validar e publicar versão final.

---

### 1.3 Upload Base Histórica
**Objetivo:** carregar histórico financeiro para diagnóstico.

- Entrada obrigatória: faturamento, CAP, CAR, extratos, estoques, carteira de pedidos, borderôs.
- Responsável execução: Admin.
- Aprovador: Admin.
- Saída esperada: base histórica normalizada e íntegra.
- SLA/Prazo: D1–D3.
- Evidência: log de carga + conferência de totais.

**Checklist de execução**
1. Receber arquivos fonte.
2. Executar normalização.
3. Validar schema e preenchimento mínimo.
4. Conciliar totais com fonte.
5. Registrar dataset validado.

---

### 1.4 Análise Base Histórica
**Objetivo:** produzir diagnóstico empresarial completo.

- Entrada obrigatória: base histórica validada + matriz de riscos.
- Responsável execução: Admin.
- Aprovador: Diretoria/Head.
- Saída esperada: diagnóstico + alertas + plano de ação.
- SLA/Prazo: D2–D5.
- Evidência: relatório versionado.

**Checklist de execução**
1. Rodar análise de dados históricos.
2. Cruzar evidências com riscos priorizados.
3. Gerar alertas de risco.
4. Definir plano de ação com prioridade.
5. Publicar relatório para validação.

---

### 1.5 Validação do Diagnóstico
**Objetivo:** aprovar versão oficial do diagnóstico.

- Periodicidade: inicial + trimestral.
- Responsável execução: Admin.
- Aprovador: Diretoria.
- Saída esperada: diagnóstico aprovado e comunicável.
- SLA/Prazo: D5 (inicial) / revisões trimestrais.
- Evidência: aprovação formal registrada.

**Checklist de execução**
1. Apresentar diagnóstico em tela.
2. Coletar ajustes dos usuários.
3. Consolidar versão final.
4. Registrar aprovação.
5. Arquivar versão oficial.

---

## 2) OPERAÇÃO DIÁRIA (obrigatório)

### 2.1 Upload da Base Diária
**Objetivo:** atualizar bases operacionais do dia.

- Entrada obrigatória: CAP, CAR, extratos, faturamento.
- Responsável execução: Consultor / Head.
- Aprovador: Head.
- Saída esperada: base diária normalizada e conciliável.
- SLA/Prazo: até D+0 10:00 (ajustável por operação).
- Evidência: log de carga + resumo de inconsistências.

**Checklist de execução**
1. Receber dados do dia.
2. Normalizar layout.
3. Validar campos críticos.
4. Executar conciliação preliminar.
5. Publicar base diária.

---

### 2.2 Painel de Risco
**Objetivo:** atualizar visão de risco operacional/financeiro.

- Entrada obrigatória: base diária + retorno FIDC + posição de vencimentos.
- Responsável execução: Consultor / Head.
- Aprovador: Head.
- Saída esperada: painel atualizado (vencidos, a vencer, modalidade, recompras).
- SLA/Prazo: até D+0 11:00.
- Evidência: snapshot/versão do painel.

**Checklist de execução**
1. Ingerir arquivos de retorno.
2. Atualizar indicadores de risco.
3. Segregar vencidos/a vencer.
4. Atualizar modalidades/recompras.
5. Publicar painel diário.

---

### 2.3 Movimento Diário
**Objetivo:** definir operação do dia com impacto controlado no caixa.

- Entrada obrigatória: pagamentos/recebimentos do dia + projeção de 15 dias + painel de risco.
- Responsável execução: Consultor / Head.
- Aprovador: Head (e Paulo quando houver impacto relevante).
- Saída esperada: decisão operacional registrada (executar/não executar).
- SLA/Prazo: até D+0 14:00.
- Evidência: registro decisório + racional + impacto estimado.

**Checklist de execução**
1. Analisar pagamentos/recebimentos do dia.
2. Projetar fluxo de caixa de 15 dias.
3. Validar saldo de segurança com usuário responsável.
4. Cruzar decisão com limites, vencidos e recompras.
5. Propor operação e impacto no caixa.
6. Registrar execução ou motivo de não execução.

---

### 2.4 Validação do Movimento Diário
**Objetivo:** fechar o dia com comunicação executiva.

- Entrada obrigatória: decisões e eventos do dia.
- Responsável execução: Consultor / Head.
- Aprovador: Head.
- Saída esperada: resumo diário enviado aos envolvidos.
- SLA/Prazo: até D+0 fim do expediente.
- Evidência: relatório diário enviado + pendências D+1.

**Checklist de execução**
1. Consolidar operações realizadas.
2. Consolidar posição de caixa final.
3. Listar pendências para o próximo dia.
4. Enviar resumo para envolvidos.
5. Arquivar comprovante de envio.

---

## 3) FECHAMENTO (mensal + monitoramento diário)

### 3.1 Alimentação Contábil (se aplicável)
**Objetivo:** manter base preparada para fechamento mensal.

- Periodicidade: diária (quando o processo contábil exigir).
- Responsável execução: Sistema.
- Aprovador: Consultor.
- Saída esperada: base sem pendências críticas de classificação.
- SLA/Prazo: diário.
- Evidência: log diário de alimentação.

---

### 3.2 Fechamento Mensal
**Objetivo:** consolidar versões finais de relatório.

- Periodicidade: mensal (1º dia útil).
- Responsável execução: Sistema + Consultor.
- Aprovador: Head.
- Saída esperada: 3 relatórios finais + análise consolidada.
- SLA/Prazo: 1º dia útil até 12:00.
- Evidência: pacote de fechamento versionado.

**Checklist de execução**
1. Rodar consolidação mensal.
2. Gerar relatórios finais.
3. Elaborar análise executiva.
4. Validar consistência de números.
5. Publicar pacote de fechamento.

---

### 3.3 Validação do Fechamento
**Objetivo:** validar e autorizar distribuição.

- Periodicidade: mensal.
- Responsável execução: Consultor / Head.
- Aprovador: Head/Diretoria.
- Saída esperada: fechamento aprovado e distribuído.
- SLA/Prazo: 1º dia útil até 17:00.
- Evidência: aprovação + confirmação de envio.

---

### 3.4 Monitoramento Diretoria
**Objetivo:** manter dashboard executivo atualizado.

- Periodicidade: diária.
- Responsável execução: Sistema.
- Aprovador: Diretoria (consumo).
- Saída esperada: indicadores executivos atualizados.
- SLA/Prazo: diário até início do expediente.
- Evidência: timestamp de atualização no dashboard.

---

## 4) Matriz RACI (resumo)

- **Admin:** implementação técnica inicial e consistência de dados.
- **Consultor:** operação diária, análise e recomendações.
- **Head:** validação operacional e decisão tática.
- **Diretoria:** aprovação de diagnóstico e fechamento.
- **Sistema:** cargas/rotinas automáticas e monitoramento.

---

## 5) Operação imediata (a partir de hoje)

1. Usar este SOP como referência única.
2. Rodar operação diária com checklists 2.1 → 2.4.
3. Registrar status de cada etapa no board operacional.
4. Escalar no mesmo dia qualquer risco crítico ou bloqueio de dados.
