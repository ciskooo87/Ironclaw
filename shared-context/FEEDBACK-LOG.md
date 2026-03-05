# FEEDBACK-LOG.md

Registro objetivo de feedbacks para evitar repetição de erro.

## Formato

- Data:
- Contexto:
- Feedback recebido:
- Causa raiz:
- Ação aplicada:
- Regra permanente:
- Status: aberto | aplicado | validado

---

## Entradas

### 2026-03-05
- Data: 2026-03-05
- Contexto: Revisão do processo por abas no Ironcore.
- Feedback recebido: "não vi mudanças" após atualização inicial.
- Causa raiz: parte do conteúdo estava documentada mas ainda não refletida na UI/fluxo esperado.
- Ação aplicada: implementação efetiva dos módulos solicitados + rebuild/restart e validação.
- Regra permanente: sempre reportar com evidência (rota, build, commit, validação funcional).
- Status: validado

### 2026-03-05
- Data: 2026-03-05
- Contexto: Solicitação de gestão de mensagens no WhatsApp.
- Feedback recebido: necessidade de operação por rascunho + aprovação.
- Causa raiz: provider WhatsApp indisponível no runtime atual.
- Ação aplicada: criação de skill de inbox manager + diagnóstico explícito de canal.
- Regra permanente: nunca assumir canal ativo sem `channels capabilities/status`.
- Status: aplicado
