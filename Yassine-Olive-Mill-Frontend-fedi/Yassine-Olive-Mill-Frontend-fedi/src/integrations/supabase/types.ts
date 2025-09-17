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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      batch: {
        Row: {
          client_id: string
          created_at: string
          date_received: string
          id: string
          net_weight: number
          number_of_boxes: number
          updated_at: string
          weight_in: number | null
          weight_out: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date_received?: string
          id?: string
          net_weight: number
          number_of_boxes: number
          updated_at?: string
          weight_in?: number | null
          weight_out?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date_received?: string
          id?: string
          net_weight?: number
          number_of_boxes?: number
          updated_at?: string
          weight_in?: number | null
          weight_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          address: string | null
          created_at: string
          firstname: string
          id: string
          lastname: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          firstname: string
          id?: string
          lastname: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          firstname?: string
          id?: string
          lastname?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      container: {
        Row: {
          capacity: number
          created_at: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      container_content: {
        Row: {
          container_id: string
          created_at: string
          currency: string | null
          id: string
          recorded_at: string
          total_weight: number
          updated_at: string
          value: number | null
        }
        Insert: {
          container_id: string
          created_at?: string
          currency?: string | null
          id?: string
          recorded_at?: string
          total_weight: number
          updated_at?: string
          value?: number | null
        }
        Update: {
          container_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          recorded_at?: string
          total_weight?: number
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "container_content_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "container"
            referencedColumns: ["id"]
          },
        ]
      }
      container_oil_batch: {
        Row: {
          container_content_id: string
          created_at: string
          id: string
          oil_batch_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          container_content_id: string
          created_at?: string
          id?: string
          oil_batch_id: string
          updated_at?: string
          weight: number
        }
        Update: {
          container_content_id?: string
          created_at?: string
          id?: string
          oil_batch_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "container_oil_batch_container_content_id_fkey"
            columns: ["container_content_id"]
            isOneToOne: false
            referencedRelation: "container_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_oil_batch_oil_batch_id_fkey"
            columns: ["oil_batch_id"]
            isOneToOne: false
            referencedRelation: "oil_batch"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_batch: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          residue: number | null
          updated_at: string
          weight: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          residue?: number | null
          updated_at?: string
          weight: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          residue?: number | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "oil_batch_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount: number
          batch_id: string | null
          client_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          batch_id?: string | null
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction"
            referencedColumns: ["id"]
          },
        ]
      }
      pressing_room: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pressing_session: {
        Row: {
          created_at: string
          finish: string | null
          id: string
          number_of_boxes: number
          pressing_room_id: string | null
          start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finish?: string | null
          id?: string
          number_of_boxes: number
          pressing_room_id?: string | null
          start: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finish?: string | null
          id?: string
          number_of_boxes?: number
          pressing_room_id?: string | null
          start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pressing_session_pressing_room_id_fkey"
            columns: ["pressing_room_id"]
            isOneToOne: false
            referencedRelation: "pressing_room"
            referencedColumns: ["id"]
          },
        ]
      }
      price: {
        Row: {
          created_at: string
          date: string
          id: string
          milling_price_per_kg: number
          oil_client_selling_price_per_kg: number
          oil_export_selling_price_per_kg: number
          olive_buying_price_per_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          milling_price_per_kg: number
          oil_client_selling_price_per_kg: number
          oil_export_selling_price_per_kg: number
          olive_buying_price_per_kg: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          milling_price_per_kg?: number
          oil_client_selling_price_per_kg?: number
          oil_export_selling_price_per_kg?: number
          olive_buying_price_per_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          firstname: string
          id: string
          is_active: boolean
          lastname: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firstname: string
          id?: string
          is_active?: boolean
          lastname: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firstname?: string
          id?: string
          is_active?: boolean
          lastname?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction: {
        Row: {
          batch_id: string
          created_at: string
          date: string
          id: string
          price_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          date?: string
          id?: string
          price_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          date?: string
          id?: string
          price_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "price"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      transaction_type: "milling" | "selling"
      user_role: "admin" | "worker" | "scanner"
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
      transaction_type: ["milling", "selling"],
      user_role: ["admin", "worker", "scanner"],
    },
  },
} as const
