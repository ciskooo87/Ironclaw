---
name: whatsapp-inbox-manager
description: Gerenciar caixa de entrada do WhatsApp com triagem, priorização e rascunhos com aprovação humana. Use quando o usuário pedir para organizar mensagens, classificar urgência, sugerir respostas e operar em modo "não enviar sem aprovação". Também use quando precisar diagnosticar conexão do canal WhatsApp no OpenClaw (status/login/capabilities) antes da operação.
---

# WhatsApp Inbox Manager

Executar este fluxo para operar mensagens com segurança e sem envio não autorizado.

## Fluxo operacional

1. Validar disponibilidade do canal:
   - Rodar `openclaw channels capabilities` e `openclaw channels status --probe`.
   - Se WhatsApp estiver indisponível/unsupported, interromper operação ativa e reportar bloqueio técnico.
2. Confirmar modo de operação com o usuário:
   - Triagem apenas
   - Rascunho + aprovação
   - Automático em casos simples (se explicitamente autorizado)
3. Aplicar triagem padrão em cada mensagem:
   - Urgente
   - Importante
   - Pode esperar
4. Gerar rascunho curto no tom do usuário, com opção alternativa mais formal.
5. Somente enviar com confirmação explícita do usuário.

## Regras de segurança

- Não enviar mensagem sem aprovação quando o modo for "Rascunho + aprovação".
- Não assumir acesso ao WhatsApp se o provider não estiver habilitado.
- Não ocultar falha de conexão; sempre informar status real do canal.
- Priorizar mensagens de trabalho e decisões bloqueantes.

## Formato de entrega recomendado

- **Urgente**: item + motivo + rascunho
- **Importante**: item + contexto + rascunho
- **Pode esperar**: item + sugestão de resposta curta

## Diagnóstico técnico mínimo

Se o usuário pedir conexão WhatsApp, executar:

1. `openclaw channels capabilities`
2. `openclaw channels list`
3. `openclaw channels login --channel whatsapp`

Se `Unsupported channel: whatsapp`, orientar habilitação do provider antes de continuar.

Detalhes operacionais: ver `references/whatsapp-ops.md`.
