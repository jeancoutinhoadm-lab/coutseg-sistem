# ETAPA 12 — CENTRAL DE RENOVAÇÃO E OPORTUNIDADES COMERCIAIS

A CoutSeg já possui:

* ciclo de vida de apólices;
* processamento de documentos com IA;
* importação de relatórios de comissão;
* conciliação financeira.

Agora vamos consolidar a inteligência operacional sobre a carteira.

O objetivo desta etapa é criar:

1. CENTRAL DE RENOVAÇÕES
2. ALERTAS DE VENCIMENTO
3. PIPELINE DE RENOVAÇÃO
4. IDENTIFICAÇÃO DE OPORTUNIDADES COMERCIAIS

IMPORTANTE:

Nesta etapa NÃO integrar WhatsApp.

NÃO enviar mensagens automaticamente.

NÃO criar campanhas.

NÃO usar IA generativa para inventar oportunidades.

Primeiro construir a inteligência baseada nos dados existentes.

---

# 1. CENTRAL DE RENOVAÇÃO

Criar/reutilizar uma tela central para acompanhar todas as apólices próximas do vencimento.

Filtros:

* hoje;
* próximos 7 dias;
* próximos 15 dias;
* próximos 30 dias;
* próximos 60 dias;
* próximos 90 dias;
* período personalizado.

---

# 2. PRIORIZAÇÃO

Cada renovação deverá possuir prioridade calculada.

Exemplo:

```text
URGENTE
ALTA
NORMAL
BAIXA
```

A prioridade deve considerar principalmente:

```text
dias até vencimento
```

e não valorizar artificialmente uma apólice apenas porque o prêmio é alto.

---

# 3. DIAS PARA VENCIMENTO

Exibir:

```text
90 dias
60 dias
30 dias
15 dias
7 dias
3 dias
VENCE HOJE
VENCIDA
```

Se a apólice estiver vencida:

não tratá-la automaticamente como renovada.

---

# 4. STATUS DE RENOVAÇÃO

Utilizar/reutilizar estrutura existente.

Estados conceituais:

```text
UPCOMING
CONTACT_PENDING
CONTACTED
QUOTE_IN_PROGRESS
QUOTE_SENT
NEGOTIATION
RENEWED
LOST
CANCELLED
```

Não criar duplicidades se a Etapa 5 já possuir estados equivalentes.

---

# 5. HISTÓRICO

Cada ação de renovação deve preservar histórico.

Exemplo:

```text
01/09
Contato realizado

03/09
Cliente pediu cotação

05/09
Cotação enviada

08/09
Cliente aprovou

10/09
Apólice renovada
```

Nunca sobrescrever o histórico anterior.

---

# 6. RESPONSÁVEL

Cada renovação deverá possuir:

```text
responsible_user_id
```

ou estrutura equivalente existente.

Isso permitirá saber:

> Quem é responsável por essa renovação?

---

# 7. SLA

Preparar estrutura para medir:

```text
tempo até primeiro contato
tempo até envio da cotação
tempo até fechamento
```

Não criar métricas falsas quando não houver dados.

---

# 8. DASHBOARD DE RENOVAÇÃO

Criar indicadores:

```text
Renovações próximas
Renovações em andamento
Renovadas
Perdidas
Canceladas
Vencidas sem contato
Taxa de renovação
```

---

# 9. TAXA DE RENOVAÇÃO

Calcular:

```text
renovadas
--------------------------
renovadas + perdidas
```

Não incluir apólices ainda em andamento.

Mostrar também a quantidade absoluta.

---

# 10. ALERTAS

Criar alertas internos para:

```text
90 dias
60 dias
30 dias
15 dias
7 dias
3 dias
1 dia
```

Mas não enviar WhatsApp ou email ainda.

O sistema deverá apenas mostrar:

```text
RENOVAÇÃO PRÓXIMA
```

---

# 11. EVITAR DUPLICAÇÃO DE ALERTAS

O mesmo evento não deve gerar dezenas de alertas repetidos.

Exemplo:

```text
Apólice X
30 dias
```

deve gerar um único evento de alerta de 30 dias.

Se o usuário já visualizou/tratou:

não criar novamente.

---

# 12. RENOVAÇÃO AUTOMÁTICA DE DATA

Não assumir que toda apólice possui renovação anual.

Observar:

```text
vigência inicial
vigência final
```

e regras existentes.

Quando a nova apólice for cadastrada/importada:

relacionar com a anterior quando houver evidência.

---

# 13. RELACIONAMENTO ENTRE APÓLICES

Preparar:

```text
apólice original
↓
renovação
↓
nova apólice
```

Exemplo:

```text
Apólice 123
2025–2026

↓ renovação

Apólice 456
2026–2027
```

O histórico deve permitir navegar entre elas.

Não apagar a apólice antiga.

---

# 14. RENOVAÇÃO PERDIDA

Se o cliente não renovar:

registrar:

```text
LOST
```

e motivo, quando conhecido.

Exemplos:

```text
Preço
Concorrência
Cliente vendeu veículo
Cliente cancelou
Outro
```

Não obrigar o usuário a inventar motivo.

Permitir:

```text
motivo desconhecido
```

---

# 15. OPORTUNIDADES COMERCIAIS

Agora vamos criar a primeira camada de cross-sell.

Não utilizar IA generativa ainda.

Utilizar regras baseadas nos produtos realmente existentes.

Exemplo:

Cliente possui:

```text
Auto
```

mas não possui:

```text
Residencial
Vida
Empresarial
```

O sistema poderá indicar:

```text
OPORTUNIDADE
Cliente possui Auto e não possui Residencial.
```

---

# 16. PRODUTOS

Não criar lista fixa dentro do frontend.

Usar os produtos existentes no banco.

Se não houver tabela adequada:

primeiro informar no relatório.

Não criar dezenas de categorias automaticamente.

---

# 17. REGRAS DE OPORTUNIDADE

Criar estrutura preparada para regras.

Exemplo:

```text
Auto
→ Residencial

Auto
→ Vida

Residencial
→ Vida

Empresarial
→ Vida

Empresarial
→ Patrimonial
```

Mas NÃO assumir que todas as combinações são válidas.

Criar mecanismo configurável.

---

# 18. EVIDÊNCIA

Toda oportunidade deve informar:

```text
POR QUE ESTA OPORTUNIDADE FOI GERADA?
```

Exemplo:

```text
Cliente possui:
✓ Seguro Auto

Não possui:
○ Seguro Residencial

Motivo:
Regra de cross-sell Auto → Residencial
```

Nunca mostrar simplesmente:

```text
"Cliente tem potencial"
```

sem explicação.

---

# 19. SCORE

Preparar estrutura para um score futuro.

Por enquanto não criar IA.

Exemplo:

```text
score = 75
```

poderia futuramente considerar:

* quantidade de produtos;
* histórico;
* proximidade da renovação;
* valor da carteira;
* relacionamento.

Mas NÃO inventar score sem regras definidas.

Se não houver regra objetiva:

não mostrar score.

---

# 20. NÃO DUPLICAR OPORTUNIDADES

O mesmo cliente não deve receber infinitas oportunidades iguais.

Exemplo:

```text
Auto → Residencial
```

deve possuir uma oportunidade controlada.

Se o usuário rejeitar:

registrar:

```text
REJECTED
```

e motivo opcional.

---

# 21. STATUS DE OPORTUNIDADE

Criar/reutilizar:

```text
NEW
CONTACT_PENDING
CONTACTED
QUOTE_CREATED
QUOTE_SENT
WON
LOST
REJECTED
```

Adaptar à estrutura existente.

---

# 22. RELACIONAR COM CRM

A oportunidade deve poder gerar uma ação comercial existente no sistema.

Exemplo:

```text
OPORTUNIDADE
↓
LEAD/NEGOCIAÇÃO
↓
COTAÇÃO
↓
PROPOSTA
↓
APÓLICE
```

Não criar um segundo CRM.

Reutilizar o pipeline existente.

---

# 23. RENOVAÇÃO + CROSS-SELL

Uma renovação pode gerar oportunidade adicional.

Exemplo:

```text
Cliente:
Auto vencendo em 20 dias

Sistema:
RENOVAÇÃO

E:
Cliente não possui Residencial

Sistema:
OPORTUNIDADE DE RESIDENCIAL
```

Essas duas coisas devem permanecer separadas.

---

# 24. CLIENTES COM MÚLTIPLOS PRODUTOS

Criar uma visão:

```text
CLIENTE
├── Auto
├── Residencial
├── Vida
└── Empresarial
```

Permitir visualizar rapidamente:

* produtos atuais;
* produtos inexistentes;
* apólices ativas;
* apólices vencidas;
* próximas renovações.

---

# 25. NÃO CONFUNDIR APÓLICE CANCELADA COM AUSÊNCIA DE PRODUTO

Exemplo:

Cliente teve:

```text
Residencial
```

mas cancelou.

O sistema não deve simplesmente tratar como:

```text
Nunca teve Residencial
```

Deve distinguir:

```text
Nunca teve
```

de:

```text
Já teve e cancelou
```

Isso será importante para futuras estratégias comerciais.

---

# 26. AUDITORIA

Registrar:

```text
RENEWAL_CREATED
RENEWAL_CONTACTED
RENEWAL_QUOTE_SENT
RENEWAL_WON
RENEWAL_LOST
OPPORTUNITY_CREATED
OPPORTUNITY_REJECTED
OPPORTUNITY_WON
OPPORTUNITY_LOST
```

Utilizar `audit_logs` existente.

---

# 27. PERMISSÕES

ADMIN:

pode visualizar e administrar tudo.

FINANCEIRO:

não precisa necessariamente acessar toda a parte comercial.

CORRETOR:

deve visualizar apenas os clientes/apólices permitidos pelas regras existentes.

Não alterar o modelo de permissões global.

---

# 28. RLS

Testar diretamente no backend/banco:

* usuário autorizado;
* usuário sem acesso;
* acesso por corretor;
* acesso administrativo.

Não confiar somente na interface.

---

# 29. TESTES DE RENOVAÇÃO

Testar:

### TESTE 1

Apólice vencendo em 90 dias.

### TESTE 2

Apólice vencendo em 30 dias.

### TESTE 3

Apólice vencendo em 7 dias.

### TESTE 4

Apólice vencida.

### TESTE 5

Apólice renovada.

### TESTE 6

Apólice perdida.

### TESTE 7

Renovação atribuída a responsável.

### TESTE 8

Histórico de contatos.

### TESTE 9

Dois usuários tentando alterar simultaneamente.

### TESTE 10

RLS.

---

# 30. TESTES DE OPORTUNIDADE

### TESTE 11

Cliente possui Auto.

Não possui Residencial.

Resultado:

```text
OPORTUNIDADE AUTO → RESIDENCIAL
```

### TESTE 12

Cliente já possui Auto + Residencial.

Não gerar novamente a mesma oportunidade.

### TESTE 13

Cliente nunca possuiu determinado produto.

Gerar conforme regra configurada.

### TESTE 14

Cliente possuía produto mas cancelou.

Não tratar como nunca teve.

### TESTE 15

Usuário rejeita oportunidade.

Não recriar imediatamente.

---

# 31. NÃO IMPLEMENTAR

Nesta etapa NÃO implementar:

* WhatsApp;
* envio automático de mensagens;
* email automático;
* IA generativa para cross-sell;
* campanhas;
* anúncios;
* Open Finance;
* novos documentos.

Primeiro consolidar a inteligência interna da carteira.

---

# 32. RELATÓRIO FINAL

Informar:

## RENOVAÇÕES

* estrutura utilizada;
* status;
* alertas;
* histórico;
* responsáveis;
* métricas.

## OPORTUNIDADES

* regras;
* produtos;
* status;
* evidências;
* relacionamento com CRM.

## DUPLICIDADE

Como evita:

* renovação duplicada;
* alerta duplicado;
* oportunidade duplicada.

## SEGURANÇA

* RLS;
* permissões;
* backend.

## TESTES

Resultado dos 15 testes.

## PROBLEMAS

Classificar:

CRÍTICO
ALTO
MÉDIO
BAIXO

## ALTERAÇÕES

Listar:

* tabelas;
* migrations;
* Edge Functions;
* componentes;
* policies;
* funções.

Não avançar para a próxima etapa automaticamente.
