export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_type: string | null
          balance: number | null
          bank_name: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          account_type?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          account_type?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      brokers: {
        Row: {
          active: boolean | null
          commission_rate: number | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          amount: number | null
          claim_number: string | null
          created_at: string | null
          description: string
          id: string
          notes: string | null
          occurrence_date: string
          policy_id: string
          resolution_date: string | null
          status: Database["public"]["Enums"]["claim_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          claim_number?: string | null
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          occurrence_date: string
          policy_id: string
          resolution_date?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          claim_number?: string | null
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          occurrence_date?: string
          policy_id?: string
          resolution_date?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          broker_id: string | null
          city: string | null
          complement: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          state: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          broker_id?: string | null
          city?: string | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          broker_id?: string | null
          city?: string | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          commission_id: string | null
          created_at: string | null
          document_id: string | null
          id: string
          notes: string | null
          receipt_date: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          commission_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          receipt_date: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          commission_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          receipt_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_receipts_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_receipts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_reconciliations: {
        Row: {
          adjustment_amount: number | null
          commission_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          previous_status: string | null
          reason: string
          reconciliation_date: string | null
          user_id: string | null
        }
        Insert: {
          adjustment_amount?: number | null
          commission_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          reason: string
          reconciliation_date?: string | null
          user_id?: string | null
        }
        Update: {
          adjustment_amount?: number | null
          commission_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          reason?: string
          reconciliation_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_reconciliations_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          created_at: string | null
          divergence_amount: number | null
          due_date: string | null
          expected_amount: number
          id: string
          policy_id: string | null
          received_amount: number | null
          received_date: string | null
          reported_amount: number | null
          statement_document_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          divergence_amount?: number | null
          due_date?: string | null
          expected_amount: number
          id?: string
          policy_id?: string | null
          received_amount?: number | null
          received_date?: string | null
          reported_amount?: number | null
          statement_document_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          divergence_amount?: number | null
          due_date?: string | null
          expected_amount?: number
          id?: string
          policy_id?: string | null
          received_amount?: number | null
          received_date?: string | null
          reported_amount?: number | null
          statement_document_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_statement_document_id_fkey"
            columns: ["statement_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          source_product_id: string | null
          target_product_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id: string
          source_product_id?: string | null
          target_product_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          source_product_id?: string | null
          target_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_rules_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_rules_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing: {
        Row: {
          ai_confidence: Json | null
          ai_model: string | null
          ai_prompt_version: string | null
          attempts: number | null
          created_at: string | null
          document_id: string | null
          document_line_count: number | null
          document_total: number | null
          error_message: string | null
          estimated_cost: number | null
          execution_duration_ms: number | null
          extracted_data: Json | null
          extracted_line_count: number | null
          extracted_total: number | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          processed_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          type: Database["public"]["Enums"]["document_type"] | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          ai_confidence?: Json | null
          ai_model?: string | null
          ai_prompt_version?: string | null
          attempts?: number | null
          created_at?: string | null
          document_id?: string | null
          document_line_count?: number | null
          document_total?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          execution_duration_ms?: number | null
          extracted_data?: Json | null
          extracted_line_count?: number | null
          extracted_total?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          ai_confidence?: Json | null
          ai_model?: string | null
          ai_prompt_version?: string | null
          attempts?: number | null
          created_at?: string | null
          document_id?: string | null
          document_line_count?: number | null
          document_total?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          execution_duration_ms?: number | null
          extracted_data?: Json | null
          extracted_line_count?: number | null
          extracted_total?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string | null
          file_hash: string | null
          file_path: string
          file_type: string | null
          id: string
          name: string
          policy_id: string | null
          size: number | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          file_hash?: string | null
          file_path: string
          file_type?: string | null
          id?: string
          name: string
          policy_id?: string | null
          size?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          file_hash?: string | null
          file_path?: string
          file_type?: string | null
          id?: string
          name?: string
          policy_id?: string | null
          size?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          created_at: string | null
          full_name: string
          hire_date: string | null
          id: string
          role: string | null
          salary: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          role?: string | null
          salary?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          role?: string | null
          salary?: number | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          date: string
          description: string
          document_id: string | null
          due_day: number | null
          id: string
          recurrence: boolean | null
          status: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          date: string
          description: string
          document_id?: string | null
          due_day?: number | null
          id?: string
          recurrence?: boolean | null
          status?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          document_id?: string | null
          due_day?: number | null
          id?: string
          recurrence?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          insurer_id: string | null
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          insurer_id?: string | null
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          insurer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_aliases_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurers: {
        Row: {
          active: boolean | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          broker_id: string | null
          client_id: string | null
          created_at: string | null
          evidence: string | null
          id: string
          notes: string | null
          original_policy_id: string | null
          priority: string | null
          product_id: string | null
          rejection_reason: string | null
          rule_id: string | null
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          broker_id?: string | null
          client_id?: string | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          notes?: string | null
          original_policy_id?: string | null
          priority?: string | null
          product_id?: string | null
          rejection_reason?: string | null
          rule_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          broker_id?: string | null
          client_id?: string | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          notes?: string | null
          original_policy_id?: string | null
          priority?: string | null
          product_id?: string | null
          rejection_reason?: string | null
          rule_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_original_policy_id_fkey"
            columns: ["original_policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          broker_id: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          client_id: string
          commission_amount: number | null
          commission_rate: number | null
          coverage_amount: number | null
          created_at: string | null
          deductible: number | null
          end_date: string
          id: string
          insurer_id: string
          issuance_date: string | null
          notes: string | null
          policy_number: string
          premium: number
          priority: string | null
          product_id: string | null
          renewal_date: string | null
          renewed_from_policy_id: string | null
          responsible_user_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["policy_status"] | null
          type: Database["public"]["Enums"]["policy_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          broker_id?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          client_id: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_amount?: number | null
          created_at?: string | null
          deductible?: number | null
          end_date: string
          id?: string
          insurer_id: string
          issuance_date?: string | null
          notes?: string | null
          policy_number: string
          premium: number
          priority?: string | null
          product_id?: string | null
          renewal_date?: string | null
          renewed_from_policy_id?: string | null
          responsible_user_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["policy_status"] | null
          type: Database["public"]["Enums"]["policy_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          broker_id?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          client_id?: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_amount?: number | null
          created_at?: string | null
          deductible?: number | null
          end_date?: string
          id?: string
          insurer_id?: string
          issuance_date?: string | null
          notes?: string | null
          policy_number?: string
          premium?: number
          priority?: string | null
          product_id?: string | null
          renewal_date?: string | null
          renewed_from_policy_id?: string | null
          responsible_user_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"] | null
          type?: Database["public"]["Enums"]["policy_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_renewed_from_policy_id_fkey"
            columns: ["renewed_from_policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          product_id: string | null
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          product_id?: string | null
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      renewal_alerts: {
        Row: {
          created_at: string | null
          days_to_expiry: number
          id: string
          policy_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_to_expiry: number
          id?: string
          policy_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_to_expiry?: number
          id?: string
          policy_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_alerts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          policy_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          policy_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          policy_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_history_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string | null
          id: string
          payment_date: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          payment_date: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          payment_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          opportunity_id: string | null
          origin: string | null
          policy_id: string | null
          priority: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          origin?: string | null
          policy_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          origin?: string | null
          policy_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_document_extraction: {
        Args: { _processing_id: string }
        Returns: undefined
      }
      calculate_policy_priority: {
        Args: { expiry_date: string }
        Returns: string
      }
      check_commission_duplicate: {
        Args: {
          _due_date: string
          _expected_amount: number
          _policy_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_commission_item_approval: {
        Args: { _document_id: string; _item: Json; _user_id: string }
        Returns: Json
      }
      reconcile_commission:
        | {
            Args: {
              _adjustment_amount: number
              _commission_id: string
              _metadata?: Json
              _reason: string
              _user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _adjustment_amount?: number
              _commission_id: string
              _new_status: string
              _reason: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role:
        | "admin"
        | "corretor"
        | "administrativo"
        | "financeiro"
        | "gerente"
      claim_status: "open" | "in_progress" | "resolved" | "closed" | "denied"
      commission_item_status:
        | "pending_review"
        | "confirmed"
        | "corrected"
        | "rejected"
      document_type:
        | "policy"
        | "bill"
        | "commission_report"
        | "proposal"
        | "endorsement"
        | "other"
      policy_status:
        | "active"
        | "pending"
        | "expired"
        | "cancelled"
        | "lead"
        | "quotation"
        | "proposal"
        | "analyzing"
        | "issued"
        | "renewed"
        | "refused"
        | "upcoming"
        | "contact_pending"
        | "contacted"
        | "quote_in_progress"
        | "quote_sent"
        | "negotiation"
        | "lost"
      policy_type: "auto" | "home" | "life" | "health" | "business" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "corretor",
        "administrativo",
        "financeiro",
        "gerente",
      ],
      claim_status: ["open", "in_progress", "resolved", "closed", "denied"],
      commission_item_status: [
        "pending_review",
        "confirmed",
        "corrected",
        "rejected",
      ],
      document_type: [
        "policy",
        "bill",
        "commission_report",
        "proposal",
        "endorsement",
        "other",
      ],
      policy_status: [
        "active",
        "pending",
        "expired",
        "cancelled",
        "lead",
        "quotation",
        "proposal",
        "analyzing",
        "issued",
        "renewed",
        "refused",
        "upcoming",
        "contact_pending",
        "contacted",
        "quote_in_progress",
        "quote_sent",
        "negotiation",
        "lost",
      ],
      policy_type: ["auto", "home", "life", "health", "business", "other"],
    },
  },
} as const
