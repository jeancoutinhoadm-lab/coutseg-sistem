# Plano de Implementação - Etapa 4: Auditoria e Reforço do Núcleo Operacional

Este plano foca na integridade dos dados, relacionamentos e segurança RLS das entidades core da CoutSeg: Clientes, Apólices, Seguradoras e Produtos.

## 1. Integridade do Banco de Dados (SQL Migration)
- **Constraint de Vigência**: Adicionar `CHECK (start_date < end_date)` na tabela `policies`.
- **Prevenção de Duplicidade**: Criar índices UNIQUE parciais (onde não for nulo) para `clients.cpf_cnpj` e `insurers.cnpj`.
- **Relacionamentos**: Garantir que `ON DELETE RESTRICT` seja aplicado em `policies.client_id` para evitar apólices órfãs por exclusão acidental de cliente.
- **Índices de Performance**: Criar índices em `clients(broker_id)`, `policies(client_id, broker_id, insurer_id, status)`.

## 2. Refinamento de Segurança (RLS)
- **Clientes**:
  - `admin`/`gerente`: Acesso total.
  - `corretor`: Apenas clientes onde `broker_id = auth.uid()` ou vinculados a apólices próprias.
  - `financeiro`/`administrativo`: Leitura total para suporte operacional.
- **Apólices**:
  - `corretor`: Apenas apólices onde `broker_id = auth.uid()`.
- **Políticas de Auditoria**: Garantir que toda alteração (INSERT/UPDATE/DELETE) passe pela trigger de auditoria.

## 3. Interface e Experiência do Usuário (Frontend)
- **Máscaras e Dados Sensíveis**: Implementar máscaras de exibição para CPF, CNPJ e telefones.
- **Diferenciação PF/PJ**: Refinar labels e campos obrigatórios dinamicamente no `ClientDialog`.
- **Vínculos de Apólices**: Exibir lista de apólices dentro da visualização de detalhes do cliente (futuro).
- **Validação de Datas**: Impedir no frontend a seleção de data final anterior à inicial.

## 4. Auditoria de Dados Existentes
- Realizar varredura por clientes duplicados ou apólices sem vínculo.
- Gerar relatório de inconsistências para decisão manual do usuário.

## Critérios de Aceite
- [ ] Não é possível criar apólice com vigência negativa.
- [ ] Corretores não conseguem ver clientes atribuídos a outros colegas.
- [ ] Tentativa de duplicar CPF/CNPJ bloqueada com erro claro.
- [ ] Relatório final detalhando o estado da base de dados.
