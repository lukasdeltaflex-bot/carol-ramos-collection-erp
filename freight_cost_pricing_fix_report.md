# Relatório de Correção: Inclusão do Frete no Simulador de Custos e Precificação

**Data**: 11 de Agosto de 2026  
**Módulo**: Simulador de Custos e Precificação (`/pricing` e `/marketplaces`)  
**Status**: Concluído com Sucesso  

---

## 1. Causa Raiz

No módulo **Simulador de Custos e Precificação**, identificou-se que:
1. Ao selecionar um produto cadastrado no dropdown do simulador (`PricingPage`), a página repassava apenas o `p.costPrice` (custo base de fornecedor sem frete), ignorando o custo efetivo de aquisição (`p.totalAcquisitionCost` ou `p.costPrice + freteEfetivo`).
2. O simulador de precificação não possuía suporte explícito à entrada e rateio do **Frete de Aquisição do Produto** (compra do fornecedor), tratando o frete unicamente como despesa de envio de venda ao cliente.

---

## 2. Arquivos Alterados (Correção Cirúrgica)

| Arquivo | Descrição das Alterações |
|---|---|
| [`src/features/pricing/utils/calculator.ts`](file:///c:/Users/lukas/Aplicativos/Carol%20Ramos%20Collection%20ERP/src/features/pricing/utils/calculator.ts) | Adicionados utilitários `calculateEffectiveAcquisitionCost` e `calculateEffectiveAcquisitionFreight`, arredondamento financeiro monetário preciso (`roundMoney`) e integração do custo efetivo de aquisição nas funções `calculatePricing` e `calculateIdealPrice`. |
| [`src/features/pricing/components/PricingSimulator.tsx`](file:///c:/Users/lukas/Aplicativos/Carol%20Ramos%20Collection%20ERP/src/features/pricing/components/PricingSimulator.tsx) | Adicionadas props de frete inicial, suporte a Frete Unitário vs Rateio por Lote/Compra, cálculo em tempo real de `effectiveAcquisitionCost`, trava contra dupla cobrança e atualização no detalhamento de custos. |
| [`src/app/(dashboard)/pricing/page.tsx`](file:///c:/Users/lukas/Aplicativos/Carol%20Ramos%20Collection%20ERP/src/app/%28dashboard%29/pricing/page.tsx) | Exibição do Custo Efetivo no `<select>` de produtos e repasse das propriedades de frete de aquisição (`freightCost`, `freightMode`, `totalFreightCost`, `totalFreightUnits`, `totalAcquisitionCost`) para o `PricingSimulator`. |
| [`src/services/marketplaces/PricingService.ts`](file:///c:/Users/lukas/Aplicativos/Carol%20Ramos%20Collection%20ERP/src/services/marketplaces/PricingService.ts) | Adicionados parâmetros opcionais de frete de aquisição e regra de cálculo do custo de compra efetivo no serviço backend de simulação. |
| [`src/app/(dashboard)/marketplaces/components/SimulatorTab.tsx`](file:///c:/Users/lukas/Aplicativos/Carol%20Ramos%20Collection%20ERP/src/app/%28dashboard%29/marketplaces/components/SimulatorTab.tsx) | Adicionado bloco de Frete de Aquisição no Custo do Produto, utilizando `effectiveBuyPrice` para os cálculos de margem, ROI, breakeven e histórico. |

---

## 3. Comparativo de Regra

### Regra Anterior
$$\text{Custo no Simulador} = \text{costPrice} \quad (\text{ignorando o frete de aquisição do fornecedor})$$

### Regra Corrigida
$$\text{Frete Efetivo Unitário} = \begin{cases} \frac{\text{Frete Total da Compra}}{\text{Quantidade de Unidades}}, & \text{se modo Rateio} \\ \text{Frete Unitário}, & \text{se modo Unitário} \end{cases}$$

$$\text{Custo Efetivo de Aquisição} = \begin{cases} \text{totalAcquisitionCost}, & \text{se pré-consolidado no produto} \\ \text{Custo Base} + \text{Frete Efetivo Unitário}, & \text{caso contrário} \end{cases}$$

---

## 4. Tratamento de `totalAcquisitionCost` e Prevenção de Dupla Cobrança

Para impedir rigorosamente a somatória duplicada do frete:
- Se o produto cadastrado já possui `totalAcquisitionCost > 0` salvo no banco de dados (que já contabiliza o frete de aquisição e eventuais seguros/impostos de compra), o simulador utiliza o `totalAcquisitionCost` diretamente como fonte de verdade do Custo Efetivo.
- Exibe o indicador visual: **`[🔒 Custo Total de Aquisição Consolidado]`**.
- Se o produto não possui o valor consolidado prévio, ele calcula: `Custo Base (R$ 100) + Frete (R$ 20) = R$ 120`.

---

## 5. Separação de Conceitos de Frete

- **Frete de Aquisição (Compra)**: Frete pago ao fornecedor/transportadora para trazer o produto. Integra o **Custo Efetivo de Aquisição**.
- **Frete de Venda / Entrega**: Despesa operacional de envio do marketplace/loja ao cliente final. Mantido como **Despesa Extra de Venda**.

---

## 6. Resultados dos Testes dos Cenários

| Cenário | Entrada | Custo Efetivo Calculado | Resultado Financeiro & Derivados | Status |
|---|---|---|---|---|
| **Cenário A — Sem Frete** | Produto: R$ 100,00 \| Frete: R$ 0,00 | **R$ 100,00** | Margem, markup e lucro calculados sobre R$ 100,00 | ✅ Aprovado |
| **Cenário B — Frete Unitário** | Produto: R$ 100,00 \| Frete Unitário: R$ 20,00 | **R$ 120,00** | Lucro Líquido e Margem usam R$ 120,00 como custo base | ✅ Aprovado |
| **Cenário C — Rateio por Quantidade** | 10 un x R$ 100,00 = R$ 1.000,00 \| Frete Total: R$ 100,00 | **R$ 110,00** (Frete rateado: R$ 10,00/un) | Custo unitário efetivo = R$ 110,00 em todas as fórmulas | ✅ Aprovado |
| **Cenário D — Alteração em Tempo Real** | Alteração de Frete R$ 20 $\rightarrow$ R$ 30 | **R$ 130,00** | Recálculo instantâneo de margem, markup e preço ideal | ✅ Aprovado |
| **Cenário E — Marketplace e Taxas** | Shopee (14% + R$ 4,00) com Venda R$ 200,00 e Custo R$ 120,00 | **R$ 120,00** | Taxas = R$ 32,00 \| Lucro Líquido = R$ 48,00 \| Margem = 24,0% | ✅ Aprovado |
| **Cenário F — Prevenção Dupla Cobrança** | Produto com `totalAcquisitionCost` = R$ 120,00 | **R$ 120,00** | Não adiciona os R$ 20,00 novamente (Custo = R$ 120,00) | ✅ Aprovado |

---

## 7. Verificação Automática e Auditoria de Regressão

### Lint (`npm run lint`)
- **Comando**: `eslint .`
- **Resultado**: `0 errors, 1 warning` (Warning pré-existente no módulo admin Firebase).

### Build (`npm run build`)
- **Comando**: `next build`
- **Compilação Turbopack**: `✓ Compiled successfully`
- **Check TypeScript**: `✓ Finished TypeScript with 0 errors`
- **Geração de Páginas Estáticas**: `✓ Generating static pages (26/26)`
- **Rotas**: Todas as 26 rotas compilaram com sucesso.
