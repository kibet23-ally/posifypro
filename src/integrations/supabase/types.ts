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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string | null
          total_spent: number | null
          updated_at: string | null
          visit_count: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone?: string | null
          total_spent?: number | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          total_spent?: number | null
          updated_at?: string | null
          visit_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category_name: string | null
          cost_price: number | null
          created_at: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          price: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_name?: string | null
          cost_price?: number | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          price: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_name?: string | null
          cost_price?: number | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          role: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cost_price: number | null
          created_at: string | null
          id: string
          product_emoji: string | null
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string | null
          subtotal: number | null
          unit_price: number | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          product_emoji?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id?: string | null
          subtotal?: number | null
          unit_price?: number | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          product_emoji?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string | null
          subtotal?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_received: number | null
          cashier_id: string | null
          cashier_name: string | null
          change_given: number | null
          created_at: string | null
          customer_name: string | null
          discount_amount: number | null
          discount_pct: number | null
          id: string
          payment_method: string | null
          receipt_number: string
          status: string | null
          subtotal: number | null
          synced: boolean | null
          tax_amount: number | null
          tax_rate: number | null
          total: number
        }
        Insert: {
          cash_received?: number | null
          cashier_id?: string | null
          cashier_name?: string | null
          change_given?: number | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          id?: string
          payment_method?: string | null
          receipt_number: string
          status?: string | null
          subtotal?: number | null
          synced?: boolean | null
          tax_amount?: number | null
          tax_rate?: number | null
          total: number
        }
        Update: {
          cash_received?: number | null
          cashier_id?: string | null
          cashier_name?: string | null
          change_given?: number | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          id?: string
          payment_method?: string | null
          receipt_number?: string
          status?: string | null
          subtotal?: number | null
          synced?: boolean | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_name: string | null
          business_phone: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          id: string
          kra_pin: string | null
          receipt_footer: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          id?: string
          kra_pin?: string | null
          receipt_footer?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          id?: string
          kra_pin?: string | null
          receipt_footer?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
