#!/usr/bin/env python3
import csv
from pathlib import Path

ROOT = Path('/home/openclaw/.openclaw/workspace')
PROJECT = ROOT / 'projects' / 'teste2'
SRC = PROJECT / 'sources'
CFG = PROJECT / 'config'

SRC.mkdir(parents=True, exist_ok=True)
CFG.mkdir(parents=True, exist_ok=True)

rows = []
periodos = ['2025-10-01','2025-11-01','2025-12-01','2026-01-01','2026-02-01']

for p in periodos:
    rows.extend([
        # Receita colapsando
        {'periodo':p,'unidade':'Comercial','kpi':'faturamento_bruto','valor_atual':420000,'meta':2100000,'variacao':'-80%','observacao':'Perda de grandes contas'},
        {'periodo':p,'unidade':'Comercial','kpi':'faturamento_bruto_diario','valor_atual':12000,'meta':70000,'variacao':'-83%','observacao':'Queda diária contínua'},

        # Margem destruída
        {'periodo':p,'unidade':'Financeiro','kpi':'resultado_liquido_exercicio','valor_atual':-380000,'meta':450000,'variacao':'-184%','observacao':'Resultado líquido fortemente negativo'},
        {'periodo':p,'unidade':'Operações','kpi':'margem_liquida_percent','valor_atual':-12,'meta':18,'variacao':'-30pp','observacao':'Margem líquida negativa'},

        # Devolução crítica
        {'periodo':p,'unidade':'DEVOLUÇÕES','kpi':'devolucoes_valor','valor_atual':510000,'meta':0,'variacao':'+999%','observacao':'Explosão de devoluções por qualidade'},

        # Estoque e caixa
        {'periodo':p,'unidade':'Estoque','kpi':'estoque_custo_total','valor_atual':4200000,'meta':1700000,'variacao':'+147%','observacao':'Estoque obsoleto e parado'},
        {'periodo':p,'unidade':'Tesouraria','kpi':'contas_pagar_janeiro','valor_atual':980000,'meta':350000,'variacao':'+180%','observacao':'Pressão severa de curto prazo'},

        # Pessoas
        {'periodo':p,'unidade':'RH','kpi':'fopag_total_geral','valor_atual':780000,'meta':420000,'variacao':'+86%','observacao':'Folha incompatível com receita atual'},
    ])

out = SRC / 'catastrofe_total.csv'
with out.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['periodo','unidade','kpi','valor_atual','meta','variacao','observacao'])
    writer.writeheader()
    writer.writerows(rows)

risk_profile = CFG / 'risk_profile.yaml'
risk_profile.write_text('materiality_min_impact: 100\nsla_days_open_warning: 3\nsla_days_open_critical: 7\n', encoding='utf-8')

print(f'Generated: {out} ({len(rows)} rows)')
