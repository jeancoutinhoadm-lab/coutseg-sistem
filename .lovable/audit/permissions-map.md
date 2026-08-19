---
name: Permissions Map
description: Role-based access control mapping for CoutSeg modules.
type: reference
---

# Mapa de Permissões CoutSeg

## Cargos (app_role)
- **ADMIN**: Acesso total (CRUD) em todos os módulos e auditoria.
- **GERENTE**: Acesso total operacional, exceto configurações globais de sistema.
- **CORRETOR**: Acesso isolado aos próprios clientes, apólices e comissões.
- **FINANCEIRO**: Acesso total ao módulo financeiro e leitura de apólices/clientes.
- **ADMINISTRATIVO**: Foco em operação de documentos e suporte ao CRM.

## Matriz de Acesso por Módulo

| Módulo | ADMIN | GERENTE | CORRETOR | FINANCEIRO | ADMINISTRATIVO |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Clientes** | CRUD | CRUD | CRUD (Own) | R | CRUD |
| **Apólices** | CRUD | CRUD | CRUD (Own) | R | CRUD |
| **Financeiro** | CRUD | CRUD | - | CRUD | R |
| **Comissões** | CRUD | CRUD | R (Own) | CRUD | - |
| **Documentos** | CRUD | CRUD | CRUD (Own) | CRUD | CRUD |
| **Insights** | R | R | R (Own) | - | - |
| **CRM** | CRUD | CRUD | CRUD (Own) | - | CRUD |
| **Configurações**| CRUD | - | - | - | - |

*Legenda: C=Create, R=Read, U=Update, D=Delete, Own=Apenas registros vinculados ao usuário/corretor.*
