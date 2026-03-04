# IronCore Release Checklist (produção)

## 1) Preparar ambiente
- Copiar `.env.example` para `.env`
- Preencher `DATABASE_URL`
- Preencher integrações (Telegram/WhatsApp/SMTP) conforme uso
- Trocar senhas padrão

## 2) Banco de dados
```bash
cd ironcore-web
export DATABASE_URL='postgres://...'
npm run migrate
```

## 3) Seed de usuários (com hash bcrypt)
```bash
cd ironcore-web
export DATABASE_URL='postgres://...'
export SEED_ADMIN_PASS='senha-forte-admin'
export SEED_HEAD_PASS='senha-forte-head'
export SEED_DIR_PASS='senha-forte-diretoria'
export SEED_CONS_PASS='senha-forte-consultor'
npm run seed:users
```

## 4) Build e execução
```bash
cd ironcore-web
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

## 5) Nginx / domínio
- Garantir proxy para `127.0.0.1:3001`
- Validar rota `/dre/`
- Validar app principal autenticado

## 6) Smoke test mínimo
- Login admin
- Criar projeto
- Lançar diário (manual + upload)
- Rodar conciliação
- Rodar rotina diária
- Ver delivery + retry
- Fechar mês
- Abrir auditoria + admin status

## 7) Segurança
- Confirmar rate-limit ativo
- Confirmar CSRF ativo nos forms críticos
- Confirmar RBAC por ação + projeto
- Conferir `delivery_runs` e `audit_log`

## 8) Go-live
- Fazer backup de banco antes do cutover
- Publicar
- Monitorar `/admin/status` nas primeiras horas
