# Go-live rápido (10 min)

```bash
cd ironcore-web
cp .env.example .env
# edite .env com DATABASE_URL e integrações
npm ci
npm run migrate
SEED_ADMIN_PASS='troque-aqui' npm run seed:users
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

Depois, valide em produção:
- `/login`
- `/dashboard`
- `/projetos`
- `/admin/status`
