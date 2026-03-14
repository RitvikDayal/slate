export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string
          id: string
          is_all_day: boolean
          location: string | null
          start_time: string
          synced_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          start_time: string
          synced_at?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          start_time?: string
          synced_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          tool_calls: Json | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          ai_summary: string | null
          created_at: string
          date: string
          highlights: Json | null
          id: string
          sent_at: string | null
          tasks_cancelled: number
          tasks_completed: number
          tasks_pending: number
          total_focus_minutes: number
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          date: string
          highlights?: Json | null
          id?: string
          sent_at?: string | null
          tasks_cancelled?: number
          tasks_completed?: number
          tasks_pending?: number
          total_focus_minutes?: number
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          date?: string
          highlights?: Json | null
          id?: string
          sent_at?: string | null
          tasks_cancelled?: number
          tasks_completed?: number
          tasks_pending?: number
          total_focus_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedules: {
        Row: {
          ai_summary: string | null
          created_at: string
          date: string
          id: string
          plan: Json
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
          user_confirmed: boolean
          user_id: string
          version: number
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          date: string
          id?: string
          plan?: Json
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          user_confirmed?: boolean
          user_id: string
          version?: number
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          date?: string
          id?: string
          plan?: Json
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          user_confirmed?: boolean
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_labels: {
        Row: {
          item_id: string
          label_id: string
        }
        Insert: {
          item_id: string
          label_id: string
        }
        Update: {
          item_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_labels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          ai_notes: string | null
          completed_at: string | null
          content_json: Json | null
          created_at: string
          due_date: string | null
          due_time: string | null
          effort: string | null
          estimated_minutes: number | null
          id: string
          is_archived: boolean
          is_completed: boolean
          is_movable: boolean
          list_id: string
          parent_item_id: string | null
          position: number
          priority: string
          recurrence_rule: string | null
          reminder_at: string | null
          scheduled_date: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          source: string
          source_ref: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          completed_at?: string | null
          content_json?: Json | null
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          effort?: string | null
          estimated_minutes?: number | null
          id?: string
          is_archived?: boolean
          is_completed?: boolean
          is_movable?: boolean
          list_id: string
          parent_item_id?: string | null
          position?: number
          priority?: string
          recurrence_rule?: string | null
          reminder_at?: string | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: string
          source_ref?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          completed_at?: string | null
          content_json?: Json | null
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          effort?: string | null
          estimated_minutes?: number | null
          id?: string
          is_archived?: boolean
          is_completed?: boolean
          is_movable?: boolean
          list_id?: string
          parent_item_id?: string | null
          position?: number
          priority?: string
          recurrence_rule?: string | null
          reminder_at?: string | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: string
          source_ref?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          is_inbox: boolean
          parent_list_id: string | null
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_inbox?: boolean
          parent_list_id?: string | null
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_inbox?: boolean
          parent_list_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_parent_list_id_fkey"
            columns: ["parent_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          read_at: string | null
          ref_id: string | null
          ref_type: Database["public"]["Enums"]["notification_ref_type"]
          scheduled_for: string
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          ref_id?: string | null
          ref_type: Database["public"]["Enums"]["notification_ref_type"]
          scheduled_for: string
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          ref_id?: string | null
          ref_type?: Database["public"]["Enums"]["notification_ref_type"]
          scheduled_for?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          eod_report_time: string
          id: string
          morning_plan_time: string
          preferences: Json | null
          push_subscription: Json | null
          slack_channels: string[] | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          eod_report_time?: string
          id: string
          morning_plan_time?: string
          preferences?: Json | null
          push_subscription?: Json | null
          slack_channels?: string[] | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          eod_report_time?: string
          id?: string
          morning_plan_time?: string
          preferences?: Json | null
          push_subscription?: Json | null
          slack_channels?: string[] | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      slack_task_suggestions: {
        Row: {
          channel_id: string
          channel_name: string
          confidence: number
          created_at: string
          id: string
          message_text: string
          message_ts: string
          reasoning: string
          status: Database["public"]["Enums"]["slack_suggestion_status"]
          suggested_effort: Database["public"]["Enums"]["task_effort"] | null
          suggested_priority: Database["public"]["Enums"]["task_priority"]
          suggested_title: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          confidence?: number
          created_at?: string
          id?: string
          message_text: string
          message_ts: string
          reasoning?: string
          status?: Database["public"]["Enums"]["slack_suggestion_status"]
          suggested_effort?: Database["public"]["Enums"]["task_effort"] | null
          suggested_priority?: Database["public"]["Enums"]["task_priority"]
          suggested_title: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          confidence?: number
          created_at?: string
          id?: string
          message_text?: string
          message_ts?: string
          reasoning?: string
          status?: Database["public"]["Enums"]["slack_suggestion_status"]
          suggested_effort?: Database["public"]["Enums"]["task_effort"] | null
          suggested_priority?: Database["public"]["Enums"]["task_priority"]
          suggested_title?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_task_suggestions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_notes: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          effort: Database["public"]["Enums"]["task_effort"] | null
          estimated_minutes: number | null
          id: string
          is_movable: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          scheduled_date: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          source: Database["public"]["Enums"]["task_source"]
          source_ref: Json | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          effort?: Database["public"]["Enums"]["task_effort"] | null
          estimated_minutes?: number | null
          id?: string
          is_movable?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          source_ref?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          effort?: Database["public"]["Enums"]["task_effort"] | null
          estimated_minutes?: number | null
          id?: string
          is_movable?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          source_ref?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_secrets: {
        Row: {
          created_at: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          slack_bot_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          slack_bot_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          slack_bot_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chat_role: "user" | "assistant"
      notification_channel: "push" | "email" | "in_app"
      notification_ref_type: "task" | "event" | "schedule" | "report"
      schedule_status: "draft" | "active" | "completed"
      slack_suggestion_status: "pending" | "accepted" | "dismissed"
      task_effort: "xs" | "s" | "m" | "l" | "xl"
      task_priority: "low" | "medium" | "high"
      task_source: "manual" | "slack" | "ai_suggested"
      task_status: "pending" | "in_progress" | "done" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chat_role: ["user", "assistant"],
      notification_channel: ["push", "email", "in_app"],
      notification_ref_type: ["task", "event", "schedule", "report"],
      schedule_status: ["draft", "active", "completed"],
      slack_suggestion_status: ["pending", "accepted", "dismissed"],
      task_effort: ["xs", "s", "m", "l", "xl"],
      task_priority: ["low", "medium", "high"],
      task_source: ["manual", "slack", "ai_suggested"],
      task_status: ["pending", "in_progress", "done", "cancelled"],
    },
  },
} as const
