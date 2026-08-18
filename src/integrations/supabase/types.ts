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
      commissions: {
        Row: {
          created_at: string | null
          due_date: string | null
          expected_amount: number
          id: string
          policy_id: string | null
          received_amount: number | null
          received_date: string | null
          statement_document_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          expected_amount: number
          id?: string
          policy_id?: string | null
          received_amount?: number | null
          received_date?: string | null
          statement_document_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          expected_amount?: number
          id?: string
          policy_id?: string | null
          received_amount?: number | null
          received_date?: string | null
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
      document_processing: {
        Row: {
          created_at: string | null
          document_id: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          processed_at: string | null
          status: string | null
          type: Database["public"]["Enums"]["document_type"] | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          processed_at?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          processed_at?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
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
          category_id: string | null
          created_at: string | null
          date: string
          description: string
          document_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date: string
          description: string
          document_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          document_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
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
          id: string
          notes: string | null
          priority: string | null
          product_id: string | null
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          broker_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          broker_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
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
          client_id: string
          commission_amount: number | null
          commission_rate: number | null
          coverage_amount: number | null
          created_at: string | null
          deductible: number | null
          end_date: string
          id: string
          insurer_id: string
          notes: string | null
          policy_number: string
          premium: number
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["policy_status"] | null
          type: Database["public"]["Enums"]["policy_type"]
          updated_at: string | null
        }
        Insert: {
          broker_id?: string | null
          client_id: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_amount?: number | null
          created_at?: string | null
          deductible?: number | null
          end_date: string
          id?: string
          insurer_id: string
          notes?: string | null
          policy_number: string
          premium: number
          renewal_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["policy_status"] | null
          type: Database["public"]["Enums"]["policy_type"]
          updated_at?: string | null
        }
        Update: {
          broker_id?: string | null
          client_id?: string
          commission_amount?: number | null
          commission_rate?: number | null
          coverage_amount?: number | null
          created_at?: string | null
          deductible?: number | null
          end_date?: string
          id?: string
          insurer_id?: string
          notes?: string | null
          policy_number?: string
          premium?: number
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"] | null
          type?: Database["public"]["Enums"]["policy_type"]
          updated_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      document_type:
        | "policy"
        | "bill"
        | "commission_report"
        | "proposal"
        | "endorsement"
        | "other"
      policy_status: "active" | "pending" | "expired" | "cancelled"
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
      document_type: [
        "policy",
        "bill",
        "commission_report",
        "proposal",
        "endorsement",
        "other",
      ],
      policy_status: ["active", "pending", "expired", "cancelled"],
      policy_type: ["auto", "home", "life", "health", "business", "other"],
    },
  },
} as const
