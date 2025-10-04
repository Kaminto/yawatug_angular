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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_auto_buyback_settings: {
        Row: {
          cooling_period_hours: number
          created_at: string
          daily_sell_threshold_percent: number
          id: string
          is_enabled: boolean
          max_daily_buyback_amount: number
          max_weekly_buyback_amount: number
          monthly_sell_threshold_percent: number
          price_premium_percent: number
          updated_at: string
          updated_by: string | null
          volume_threshold_multiplier: number
          weekly_sell_threshold_percent: number
        }
        Insert: {
          cooling_period_hours?: number
          created_at?: string
          daily_sell_threshold_percent?: number
          id?: string
          is_enabled?: boolean
          max_daily_buyback_amount?: number
          max_weekly_buyback_amount?: number
          monthly_sell_threshold_percent?: number
          price_premium_percent?: number
          updated_at?: string
          updated_by?: string | null
          volume_threshold_multiplier?: number
          weekly_sell_threshold_percent?: number
        }
        Update: {
          cooling_period_hours?: number
          created_at?: string
          daily_sell_threshold_percent?: number
          id?: string
          is_enabled?: boolean
          max_daily_buyback_amount?: number
          max_weekly_buyback_amount?: number
          monthly_sell_threshold_percent?: number
          price_premium_percent?: number
          updated_at?: string
          updated_by?: string | null
          volume_threshold_multiplier?: number
          weekly_sell_threshold_percent?: number
        }
        Relationships: []
      }
      admin_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          approval_status: string | null
          bank_code: string | null
          bank_name: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string
          approval_status?: string | null
          bank_code?: string | null
          bank_name: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          approval_status?: string | null
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_dynamic_pricing_settings: {
        Row: {
          calculation_frequency: string
          calculation_time: string
          created_at: string
          dividend_weight: number
          id: string
          is_enabled: boolean
          market_activity_period: string
          market_activity_weight: number
          minimum_price_floor: number
          mining_profit_weight: number
          price_volatility_limit: number
          risk_tolerance: number | null
          sensitivity_scale: number
          trend_analysis_days: number
          update_interval_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calculation_frequency?: string
          calculation_time?: string
          created_at?: string
          dividend_weight?: number
          id?: string
          is_enabled?: boolean
          market_activity_period?: string
          market_activity_weight?: number
          minimum_price_floor?: number
          mining_profit_weight?: number
          price_volatility_limit?: number
          risk_tolerance?: number | null
          sensitivity_scale?: number
          trend_analysis_days?: number
          update_interval_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calculation_frequency?: string
          calculation_time?: string
          created_at?: string
          dividend_weight?: number
          id?: string
          is_enabled?: boolean
          market_activity_period?: string
          market_activity_weight?: number
          minimum_price_floor?: number
          mining_profit_weight?: number
          price_volatility_limit?: number
          risk_tolerance?: number | null
          sensitivity_scale?: number
          trend_analysis_days?: number
          update_interval_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_expenses: {
        Row: {
          amount: number
          category_id: string
          category_name: string
          created_at: string
          currency: string
          description: string
          id: string
          processed_at: string
          processed_by: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          category_name: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          processed_at?: string
          processed_by?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          category_name?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          processed_at?: string
          processed_by?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_market_making_settings: {
        Row: {
          ask_spread_percent: number
          auto_market_make_during_high_volume: boolean
          bid_spread_percent: number
          created_at: string
          high_volume_threshold_multiplier: number
          id: string
          is_enabled: boolean
          market_making_hours_end: string
          market_making_hours_start: string
          max_liquidity_per_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ask_spread_percent?: number
          auto_market_make_during_high_volume?: boolean
          bid_spread_percent?: number
          created_at?: string
          high_volume_threshold_multiplier?: number
          id?: string
          is_enabled?: boolean
          market_making_hours_end?: string
          market_making_hours_start?: string
          max_liquidity_per_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ask_spread_percent?: number
          auto_market_make_during_high_volume?: boolean
          bid_spread_percent?: number
          created_at?: string
          high_volume_threshold_multiplier?: number
          id?: string
          is_enabled?: boolean
          market_making_hours_end?: string
          market_making_hours_start?: string
          max_liquidity_per_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_merchant_codes: {
        Row: {
          api_endpoint: string | null
          approval_status: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          environment: string
          id: string
          is_active: boolean
          merchant_code: string
          provider_name: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_endpoint?: string | null
          approval_status?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          merchant_code: string
          provider_name: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_endpoint?: string | null
          approval_status?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          environment?: string
          id?: string
          is_active?: boolean
          merchant_code?: string
          provider_name?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      admin_notification_preferences: {
        Row: {
          admin_id: string
          created_at: string | null
          email_enabled: boolean | null
          enabled: boolean | null
          id: string
          notification_type: string
          push_enabled: boolean | null
          threshold_value: number | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          email_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          notification_type: string
          push_enabled?: boolean | null
          threshold_value?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          email_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          notification_type?: string
          push_enabled?: boolean | null
          threshold_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notification_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notification_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notification_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notification_type: string
          sms_enabled: boolean | null
          threshold_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type: string
          sms_enabled?: boolean | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type?: string
          sms_enabled?: boolean | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_operations_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          operation_data: Json
          operation_type: string
          priority: number
          progress_percentage: number | null
          retry_count: number | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          target_ids: string[]
          target_table: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          operation_data?: Json
          operation_type: string
          priority?: number
          progress_percentage?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          target_ids?: string[]
          target_table: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          operation_data?: Json
          operation_type?: string
          priority?: number
          progress_percentage?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          target_ids?: string[]
          target_table?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_operations_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_operations_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_operations_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_operations_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_payment_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          setting_name: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_name: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_name?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_sub_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
          wallet_name: string
          wallet_type: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          wallet_name: string
          wallet_type: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          wallet_name?: string
          wallet_type?: string
        }
        Relationships: []
      }
      admin_trading_notification_settings: {
        Row: {
          created_at: string
          daily_summary_emails: boolean
          email_notifications_enabled: boolean
          id: string
          price_change_notifications: boolean
          push_notifications_enabled: boolean
          queue_position_updates: boolean
          realtime_updates_enabled: boolean
          sms_notifications_enabled: boolean
          transaction_completion_notifications: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          daily_summary_emails?: boolean
          email_notifications_enabled?: boolean
          id?: string
          price_change_notifications?: boolean
          push_notifications_enabled?: boolean
          queue_position_updates?: boolean
          realtime_updates_enabled?: boolean
          sms_notifications_enabled?: boolean
          transaction_completion_notifications?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          daily_summary_emails?: boolean
          email_notifications_enabled?: boolean
          id?: string
          price_change_notifications?: boolean
          push_notifications_enabled?: boolean
          queue_position_updates?: boolean
          realtime_updates_enabled?: boolean
          sms_notifications_enabled?: boolean
          transaction_completion_notifications?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_user_sessions: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_verification_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          notes: string | null
          target_document_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          target_document_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          target_document_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_verification_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_verification_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_target_document_id_fkey"
            columns: ["target_document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_verification_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_verification_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_wallet_approvals: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          notes: string | null
          request_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_wallet_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "user_wallet_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_wallet_fund_transfers: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          from_wallet_id: string | null
          id: string
          reference: string | null
          status: string
          to_wallet_id: string | null
          transfer_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          from_wallet_id?: string | null
          id?: string
          reference?: string | null
          status?: string
          to_wallet_id?: string | null
          transfer_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          from_wallet_id?: string | null
          id?: string
          reference?: string | null
          status?: string
          to_wallet_id?: string | null
          transfer_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_wallet_fund_transfers_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "admin_sub_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_wallet_fund_transfers_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "admin_sub_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_wallet_transactions: {
        Row: {
          admin_wallet_id: string
          amount: number
          created_at: string | null
          created_by: string
          currency: string
          description: string
          id: string
          status: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          admin_wallet_id: string
          amount: number
          created_at?: string | null
          created_by: string
          currency: string
          description: string
          id?: string
          status?: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          admin_wallet_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string
          currency?: string
          description?: string
          id?: string
          status?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_wallet_transactions_admin_wallet_id_fkey"
            columns: ["admin_wallet_id"]
            isOneToOne: false
            referencedRelation: "admin_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          id: string
          updated_at: string | null
          wallet_type: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency: string
          id?: string
          updated_at?: string | null
          wallet_type: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          wallet_type?: string
        }
        Relationships: []
      }
      agent_applications: {
        Row: {
          business_plan: string | null
          created_at: string | null
          expected_customers: number
          experience: string | null
          id: string
          location: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_plan?: string | null
          created_at?: string | null
          expected_customers: number
          experience?: string | null
          id?: string
          location: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_plan?: string | null
          created_at?: string | null
          expected_customers?: number
          experience?: string | null
          id?: string
          location?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_chat_availability: {
        Row: {
          created_at: string | null
          current_chat_count: number | null
          id: string
          is_online: boolean
          last_seen: string | null
          max_concurrent_chats: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_chat_count?: number | null
          id?: string
          is_online?: boolean
          last_seen?: string | null
          max_concurrent_chats?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_chat_count?: number | null
          id?: string
          is_online?: boolean
          last_seen?: string | null
          max_concurrent_chats?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_clients: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string | null
          id: string
          onboarded_at: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string | null
          id?: string
          onboarded_at?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          onboarded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commissions: {
        Row: {
          agent_id: string
          client_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          paid_at: string | null
          status: string | null
          transaction_amount: number
          transaction_id: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          transaction_amount: number
          transaction_id?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          transaction_amount?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_income_streams: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          currency: string
          id: string
          income_type: string
          metadata: Json | null
          paid_at: string | null
          payment_status: string
          processed_at: string | null
          source_reference: string | null
          source_transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          income_type: string
          metadata?: Json | null
          paid_at?: string | null
          payment_status?: string
          processed_at?: string | null
          source_reference?: string | null
          source_transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          income_type?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_status?: string
          processed_at?: string | null
          source_reference?: string | null
          source_transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_income_streams_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          active_clients: number | null
          agent_fee_earnings: number | null
          agent_id: string
          average_transaction_size: number | null
          capital_gains: number | null
          client_retention_rate: number | null
          commission_earnings: number | null
          created_at: string | null
          currency: string
          dividend_earnings: number | null
          id: string
          metric_date: string
          new_clients_month: number | null
          referral_earnings: number | null
          total_clients: number | null
          total_earnings: number | null
          total_fees_generated: number | null
          total_transaction_volume: number | null
          total_transactions_facilitated: number | null
          updated_at: string | null
        }
        Insert: {
          active_clients?: number | null
          agent_fee_earnings?: number | null
          agent_id: string
          average_transaction_size?: number | null
          capital_gains?: number | null
          client_retention_rate?: number | null
          commission_earnings?: number | null
          created_at?: string | null
          currency?: string
          dividend_earnings?: number | null
          id?: string
          metric_date?: string
          new_clients_month?: number | null
          referral_earnings?: number | null
          total_clients?: number | null
          total_earnings?: number | null
          total_fees_generated?: number | null
          total_transaction_volume?: number | null
          total_transactions_facilitated?: number | null
          updated_at?: string | null
        }
        Update: {
          active_clients?: number | null
          agent_fee_earnings?: number | null
          agent_id?: string
          average_transaction_size?: number | null
          capital_gains?: number | null
          client_retention_rate?: number | null
          commission_earnings?: number | null
          created_at?: string | null
          currency?: string
          dividend_earnings?: number | null
          id?: string
          metric_date?: string
          new_clients_month?: number | null
          referral_earnings?: number | null
          total_clients?: number | null
          total_earnings?: number | null
          total_fees_generated?: number | null
          total_transaction_volume?: number | null
          total_transactions_facilitated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_transaction_fees: {
        Row: {
          agent_fee_amount: number
          agent_fee_share_percentage: number
          agent_id: string
          client_id: string
          created_at: string | null
          currency: string
          id: string
          payment_status: string
          processed_at: string | null
          total_fee_amount: number
          transaction_amount: number
          transaction_id: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          agent_fee_amount: number
          agent_fee_share_percentage?: number
          agent_id: string
          client_id: string
          created_at?: string | null
          currency?: string
          id?: string
          payment_status?: string
          processed_at?: string | null
          total_fee_amount: number
          transaction_amount: number
          transaction_id: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          agent_fee_amount?: number
          agent_fee_share_percentage?: number
          agent_id?: string
          client_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          payment_status?: string
          processed_at?: string | null
          total_fee_amount?: number
          transaction_amount?: number
          transaction_id?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_transaction_fees_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_transaction_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transaction_history_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active_clients: number | null
          agent_code: string
          commission_rate: number | null
          created_at: string | null
          fee_share_percentage: number | null
          id: string
          last_performance_update: string | null
          performance_score: number | null
          status: string | null
          tier: string | null
          total_clients: number | null
          total_earnings: number | null
          total_fees_generated: number | null
          total_transaction_volume: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_clients?: number | null
          agent_code: string
          commission_rate?: number | null
          created_at?: string | null
          fee_share_percentage?: number | null
          id?: string
          last_performance_update?: string | null
          performance_score?: number | null
          status?: string | null
          tier?: string | null
          total_clients?: number | null
          total_earnings?: number | null
          total_fees_generated?: number | null
          total_transaction_volume?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_clients?: number | null
          agent_code?: string
          commission_rate?: number | null
          created_at?: string | null
          fee_share_percentage?: number | null
          id?: string
          last_performance_update?: string | null
          performance_score?: number | null
          status?: string | null
          tier?: string | null
          total_clients?: number | null
          total_earnings?: number | null
          total_fees_generated?: number | null
          total_transaction_volume?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_logs: {
        Row: {
          ai_response: string
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          updated_at: string | null
          user_id: string
          user_message: string
          user_role: string
        }
        Insert: {
          ai_response: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string | null
          user_id: string
          user_message: string
          user_role?: string
        }
        Update: {
          ai_response?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_message?: string
          user_role?: string
        }
        Relationships: []
      }
      allocation_rules: {
        Row: {
          admin_fund_percent: number
          buyback_percent: number
          created_at: string | null
          currency: string
          expenses_percent: number
          id: string
          is_active: boolean
          operational_expenses_percent: number
          project_funding_percent: number
          updated_at: string | null
        }
        Insert: {
          admin_fund_percent?: number
          buyback_percent: number
          created_at?: string | null
          currency?: string
          expenses_percent: number
          id?: string
          is_active?: boolean
          operational_expenses_percent?: number
          project_funding_percent: number
          updated_at?: string | null
        }
        Update: {
          admin_fund_percent?: number
          buyback_percent?: number
          created_at?: string | null
          currency?: string
          expenses_percent?: number
          id?: string
          is_active?: boolean
          operational_expenses_percent?: number
          project_funding_percent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          announcement_type: string | null
          content: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          published_at: string | null
          target_audience: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type?: string | null
          content: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          published_at?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          published_at?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      app_sync_data: {
        Row: {
          created_at: string
          data_content: Json
          data_type: string
          id: string
          last_synced: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_content: Json
          data_type: string
          id?: string
          last_synced?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_content?: Json
          data_type?: string
          id?: string
          last_synced?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_logs: {
        Row: {
          action: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_profile_sync_log: {
        Row: {
          attempt_count: number | null
          auth_user_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          profile_id: string | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          profile_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          profile_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_profile_sync_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auth_profile_sync_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_profile_sync_operations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation_type: string
          status: string
          target_profile_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          status?: string
          target_profile_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          status?: string
          target_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_profile_sync_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_profile_sync_operations_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_update_logs: {
        Row: {
          id: string
          new_balance: number | null
          old_balance: number | null
          transaction_id: string | null
          trigger_event: string | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          id?: string
          new_balance?: number | null
          old_balance?: number | null
          transaction_id?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          id?: string
          new_balance?: number | null
          old_balance?: number | null
          transaction_id?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_update_logs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          face_id_data: Json | null
          fingerprint_data: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          face_id_data?: Json | null
          fingerprint_data?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          face_id_data?: Json | null
          fingerprint_data?: Json | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bulk_operations_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          failure_count: number | null
          id: string
          operation_data: Json | null
          operation_type: string
          performed_by: string | null
          status: string | null
          success_count: number | null
          target_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          operation_data?: Json | null
          operation_type: string
          performed_by?: string | null
          status?: string | null
          success_count?: number | null
          target_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          operation_data?: Json | null
          operation_type?: string
          performed_by?: string | null
          status?: string | null
          success_count?: number | null
          target_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operations_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_operations_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bulk_operations_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_operations_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      buyback_fund_transactions: {
        Row: {
          amount: number
          authorization_notes: string | null
          authorized_by: string
          balance_after: number
          balance_before: number
          created_at: string
          currency: string
          description: string
          id: string
          processing_batch_id: string | null
          reference_id: string | null
          sell_order_id: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          authorization_notes?: string | null
          authorized_by: string
          balance_after: number
          balance_before: number
          created_at?: string
          currency?: string
          description: string
          id?: string
          processing_batch_id?: string | null
          reference_id?: string | null
          sell_order_id?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          authorization_notes?: string | null
          authorized_by?: string
          balance_after?: number
          balance_before?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          processing_batch_id?: string | null
          reference_id?: string | null
          sell_order_id?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyback_fund_transactions_processing_batch_id_fkey"
            columns: ["processing_batch_id"]
            isOneToOne: false
            referencedRelation: "sell_order_processing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_fund_transactions_sell_order_id_fkey"
            columns: ["sell_order_id"]
            isOneToOne: false
            referencedRelation: "share_sell_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_to: string
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to: string
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to?: string
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_configurations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          system_instructions: string
          updated_at: string | null
          updated_by: string | null
          user_type: string
          voice_enabled: boolean | null
          voice_speed: number | null
          voice_type: string | null
          welcome_message: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          system_instructions: string
          updated_at?: string | null
          updated_by?: string | null
          user_type: string
          voice_enabled?: boolean | null
          voice_speed?: number | null
          voice_type?: string | null
          welcome_message: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          system_instructions?: string
          updated_at?: string | null
          updated_by?: string | null
          user_type?: string
          voice_enabled?: boolean | null
          voice_speed?: number | null
          voice_type?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          created_at: string | null
          ended_at: string | null
          escalated_to_human: boolean | null
          escalation_reason: string | null
          id: string
          session_id: string
          started_at: string | null
          total_messages: number | null
          updated_at: string | null
          user_feedback_comment: string | null
          user_feedback_rating: number | null
          user_id: string | null
          visitor_identifier: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          escalated_to_human?: boolean | null
          escalation_reason?: string | null
          id?: string
          session_id: string
          started_at?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_feedback_comment?: string | null
          user_feedback_rating?: number | null
          user_id?: string | null
          visitor_identifier?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          escalated_to_human?: boolean | null
          escalation_reason?: string | null
          id?: string
          session_id?: string
          started_at?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_feedback_comment?: string | null
          user_feedback_rating?: number | null
          user_id?: string | null
          visitor_identifier?: string | null
        }
        Relationships: []
      }
      chatbot_knowledge: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          keywords: string[] | null
          question: string
          target_user_types: string[] | null
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          question: string
          target_user_types?: string[] | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          question?: string
          target_user_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_quick_actions: {
        Row: {
          action_category: string | null
          action_description: string | null
          action_key: string
          action_label: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          target_route: string | null
          updated_at: string | null
        }
        Insert: {
          action_category?: string | null
          action_description?: string | null
          action_key: string
          action_label: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          target_route?: string | null
          updated_at?: string | null
        }
        Update: {
          action_category?: string | null
          action_description?: string | null
          action_key?: string
          action_label?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          target_route?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          country: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          country: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      club_consent_email_logs: {
        Row: {
          club_allocation_id: string
          created_at: string | null
          email_content: string | null
          email_type: string
          id: string
          member_email: string
          sent_at: string | null
        }
        Insert: {
          club_allocation_id: string
          created_at?: string | null
          email_content?: string | null
          email_type?: string
          id?: string
          member_email: string
          sent_at?: string | null
        }
        Update: {
          club_allocation_id?: string
          created_at?: string | null
          email_content?: string | null
          email_type?: string
          id?: string
          member_email?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_consent_email_logs_club_allocation_id_fkey"
            columns: ["club_allocation_id"]
            isOneToOne: false
            referencedRelation: "club_share_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      club_share_allocations: {
        Row: {
          admin_release_percentage: number | null
          allocated_shares: number
          allocation_status: string
          can_reapply_after: string | null
          club_member_id: string
          consent_deadline: string
          consent_signed_at: string | null
          cost_per_share: number | null
          created_at: string | null
          debt_amount_settled: number
          debt_rejected: number | null
          id: string
          import_batch_reference: string | null
          last_rejection_at: string | null
          phased_release_schedule: Json | null
          rejection_count: number | null
          rejection_reason: string | null
          total_cost: number | null
          transfer_fee_paid: number
          updated_at: string | null
        }
        Insert: {
          admin_release_percentage?: number | null
          allocated_shares: number
          allocation_status?: string
          can_reapply_after?: string | null
          club_member_id: string
          consent_deadline?: string
          consent_signed_at?: string | null
          cost_per_share?: number | null
          created_at?: string | null
          debt_amount_settled?: number
          debt_rejected?: number | null
          id?: string
          import_batch_reference?: string | null
          last_rejection_at?: string | null
          phased_release_schedule?: Json | null
          rejection_count?: number | null
          rejection_reason?: string | null
          total_cost?: number | null
          transfer_fee_paid?: number
          updated_at?: string | null
        }
        Update: {
          admin_release_percentage?: number | null
          allocated_shares?: number
          allocation_status?: string
          can_reapply_after?: string | null
          club_member_id?: string
          consent_deadline?: string
          consent_signed_at?: string | null
          cost_per_share?: number | null
          created_at?: string | null
          debt_amount_settled?: number
          debt_rejected?: number | null
          id?: string
          import_batch_reference?: string | null
          last_rejection_at?: string | null
          phased_release_schedule?: Json | null
          rejection_count?: number | null
          rejection_reason?: string | null
          total_cost?: number | null
          transfer_fee_paid?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_share_allocations_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "investment_club_members"
            referencedColumns: ["id"]
          },
        ]
      }
      club_share_consent_invitations: {
        Row: {
          club_allocation_id: string
          club_member_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          phone: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          club_allocation_id: string
          club_member_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          phone?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          club_allocation_id?: string
          club_member_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          phone?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_share_consent_invitations_club_allocation_id_fkey"
            columns: ["club_allocation_id"]
            isOneToOne: false
            referencedRelation: "club_share_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      club_share_holding_account: {
        Row: {
          club_allocation_id: string
          club_member_id: string
          created_at: string | null
          expected_release_date: string | null
          id: string
          shares_quantity: number
          shares_released: number | null
          shares_remaining: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          club_allocation_id: string
          club_member_id: string
          created_at?: string | null
          expected_release_date?: string | null
          id?: string
          shares_quantity: number
          shares_released?: number | null
          shares_remaining?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          club_allocation_id?: string
          club_member_id?: string
          created_at?: string | null
          expected_release_date?: string | null
          id?: string
          shares_quantity?: number
          shares_released?: number | null
          shares_remaining?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_share_holding_account_club_allocation_id_fkey"
            columns: ["club_allocation_id"]
            isOneToOne: false
            referencedRelation: "club_share_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_share_holding_account_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "investment_club_members"
            referencedColumns: ["id"]
          },
        ]
      }
      club_share_holding_accounts: {
        Row: {
          club_allocation_id: string
          club_member_id: string
          created_at: string
          id: string
          shares_quantity: number
          shares_released: number
          shares_remaining: number
          status: string
          updated_at: string
        }
        Insert: {
          club_allocation_id: string
          club_member_id: string
          created_at?: string
          id?: string
          shares_quantity?: number
          shares_released?: number
          shares_remaining?: number
          status?: string
          updated_at?: string
        }
        Update: {
          club_allocation_id?: string
          club_member_id?: string
          created_at?: string
          id?: string
          shares_quantity?: number
          shares_released?: number
          shares_remaining?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_share_holding_accounts_club_allocation_id_fkey"
            columns: ["club_allocation_id"]
            isOneToOne: true
            referencedRelation: "club_share_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      club_share_release_log: {
        Row: {
          club_allocation_id: string
          club_holding_account_id: string
          created_at: string | null
          id: string
          market_ratio_data: Json | null
          release_percentage: number
          release_reason: string | null
          release_trigger: string
          released_at: string | null
          released_by_admin: string | null
          shares_released: number
          user_share_holding_id: string | null
        }
        Insert: {
          club_allocation_id: string
          club_holding_account_id: string
          created_at?: string | null
          id?: string
          market_ratio_data?: Json | null
          release_percentage: number
          release_reason?: string | null
          release_trigger: string
          released_at?: string | null
          released_by_admin?: string | null
          shares_released: number
          user_share_holding_id?: string | null
        }
        Update: {
          club_allocation_id?: string
          club_holding_account_id?: string
          created_at?: string | null
          id?: string
          market_ratio_data?: Json | null
          release_percentage?: number
          release_reason?: string | null
          release_trigger?: string
          released_at?: string | null
          released_by_admin?: string | null
          shares_released?: number
          user_share_holding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_share_release_log_club_allocation_id_fkey"
            columns: ["club_allocation_id"]
            isOneToOne: false
            referencedRelation: "club_share_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_share_release_log_club_holding_account_id_fkey"
            columns: ["club_holding_account_id"]
            isOneToOne: false
            referencedRelation: "club_share_holding_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_share_release_log_released_by_admin_fkey"
            columns: ["released_by_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_share_release_log_released_by_admin_fkey"
            columns: ["released_by_admin"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "club_share_release_log_released_by_admin_fkey"
            columns: ["released_by_admin"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_share_release_log_released_by_admin_fkey"
            columns: ["released_by_admin"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string | null
          created_at: string | null
          error_details: Json | null
          id: number
          message: string
          provider: string | null
          recipient: string
          status: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: never
          message: string
          provider?: string | null
          recipient: string
          status?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: never
          message?: string
          provider?: string | null
          recipient?: string
          status?: string | null
        }
        Relationships: []
      }
      communications_unified: {
        Row: {
          business_process: string
          business_reference_id: string | null
          channels_completed: string[]
          channels_failed: string[]
          channels_requested: string[]
          completed_at: string | null
          correlation_id: string
          created_at: string | null
          failed_at: string | null
          id: string
          initiated_by: string | null
          metadata: Json | null
          overall_status: string
          priority: string
          template_data: Json | null
          template_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_process: string
          business_reference_id?: string | null
          channels_completed?: string[]
          channels_failed?: string[]
          channels_requested?: string[]
          completed_at?: string | null
          correlation_id?: string
          created_at?: string | null
          failed_at?: string | null
          id?: string
          initiated_by?: string | null
          metadata?: Json | null
          overall_status?: string
          priority?: string
          template_data?: Json | null
          template_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_process?: string
          business_reference_id?: string | null
          channels_completed?: string[]
          channels_failed?: string[]
          channels_requested?: string[]
          completed_at?: string | null
          correlation_id?: string
          created_at?: string | null
          failed_at?: string | null
          id?: string
          initiated_by?: string | null
          metadata?: Json | null
          overall_status?: string
          priority?: string
          template_data?: Json | null
          template_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_unified_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_unified_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communications_unified_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_unified_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_unified_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_unified_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communications_unified_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_unified_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_profile_creation_log: {
        Row: {
          auth_account_created: boolean | null
          club_member_id: string
          created_at: string
          creation_status: string | null
          error_details: string | null
          id: string
          invitation_id: string
          profile_created: boolean | null
          updated_at: string
          user_id: string | null
          wallets_created: boolean | null
        }
        Insert: {
          auth_account_created?: boolean | null
          club_member_id: string
          created_at?: string
          creation_status?: string | null
          error_details?: string | null
          id?: string
          invitation_id: string
          profile_created?: boolean | null
          updated_at?: string
          user_id?: string | null
          wallets_created?: boolean | null
        }
        Update: {
          auth_account_created?: boolean | null
          club_member_id?: string
          created_at?: string
          creation_status?: string | null
          error_details?: string | null
          id?: string
          invitation_id?: string
          profile_created?: boolean | null
          updated_at?: string
          user_id?: string | null
          wallets_created?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_profile_creation_log_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "club_share_consent_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_persons: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_persons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_persons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contact_persons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_persons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_conversion_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          minimum_conversion_amount: number
          shares_per_credit: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_conversion_amount?: number
          shares_per_credit?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_conversion_amount?: number
          shares_per_credit?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_conversion_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_conversion_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credit_conversion_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_conversion_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          source_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_conversion: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          rate: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_exchange_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          exchange_rate: number
          fee_amount: number | null
          from_amount: number
          from_currency: string
          id: string
          otp_verified: boolean | null
          status: string | null
          to_amount: number
          to_currency: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          exchange_rate: number
          fee_amount?: number | null
          from_amount: number
          from_currency: string
          id?: string
          otp_verified?: boolean | null
          status?: string | null
          to_amount: number
          to_currency: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          exchange_rate?: number
          fee_amount?: number | null
          from_amount?: number
          from_currency?: string
          id?: string
          otp_verified?: boolean | null
          status?: string | null
          to_amount?: number
          to_currency?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debt_conversion_agreements: {
        Row: {
          club_member_id: string
          consent_given: boolean | null
          consent_given_at: string | null
          conversion_eligible: boolean | null
          conversion_rate: number
          converted: boolean | null
          converted_at: string | null
          created_at: string
          current_share_price_at_agreement: number | null
          debt_amount: number
          fee_paid: boolean | null
          fee_payment_id: string | null
          id: string
          shares_to_receive: number
          updated_at: string
        }
        Insert: {
          club_member_id: string
          consent_given?: boolean | null
          consent_given_at?: string | null
          conversion_eligible?: boolean | null
          conversion_rate: number
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          current_share_price_at_agreement?: number | null
          debt_amount: number
          fee_paid?: boolean | null
          fee_payment_id?: string | null
          id?: string
          shares_to_receive: number
          updated_at?: string
        }
        Update: {
          club_member_id?: string
          consent_given?: boolean | null
          consent_given_at?: string | null
          conversion_eligible?: boolean | null
          conversion_rate?: number
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          current_share_price_at_agreement?: number | null
          debt_amount?: number
          fee_paid?: boolean | null
          fee_payment_id?: string | null
          id?: string
          shares_to_receive?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_conversion_agreements_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "investment_club_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_conversion_agreements_fee_payment_id_fkey"
            columns: ["fee_payment_id"]
            isOneToOne: false
            referencedRelation: "debt_conversion_fee_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_conversion_fee_payments: {
        Row: {
          amount: number
          club_member_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_method: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          club_member_id: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          club_member_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_conversion_fee_payments_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "investment_club_members"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_conversion_fee_settings: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          fixed_fee_amount: number
          id: string
          is_active: boolean
          percentage_fee: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          fixed_fee_amount?: number
          id?: string
          is_active?: boolean
          percentage_fee?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          fixed_fee_amount?: number
          id?: string
          is_active?: boolean
          percentage_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      dividend_declarations: {
        Row: {
          company_valuation: number
          created_at: string
          created_by: string
          cut_off_date: string | null
          declaration_date: string
          description: string | null
          eligible_shareholders_count: number | null
          id: string
          market_cap: number
          payment_date: string | null
          payment_type: string
          per_share_amount: number
          status: string
          total_dividend: number
          total_eligible_shares: number | null
          updated_at: string
        }
        Insert: {
          company_valuation: number
          created_at?: string
          created_by: string
          cut_off_date?: string | null
          declaration_date?: string
          description?: string | null
          eligible_shareholders_count?: number | null
          id?: string
          market_cap: number
          payment_date?: string | null
          payment_type?: string
          per_share_amount: number
          status?: string
          total_dividend: number
          total_eligible_shares?: number | null
          updated_at?: string
        }
        Update: {
          company_valuation?: number
          created_at?: string
          created_by?: string
          cut_off_date?: string | null
          declaration_date?: string
          description?: string | null
          eligible_shareholders_count?: number | null
          id?: string
          market_cap?: number
          payment_date?: string | null
          payment_type?: string
          per_share_amount?: number
          status?: string
          total_dividend?: number
          total_eligible_shares?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dividend_payments: {
        Row: {
          amount: number
          bonus_shares: number | null
          created_at: string
          dividend_declaration_id: string
          id: string
          shares_owned: number
          status: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          bonus_shares?: number | null
          created_at?: string
          dividend_declaration_id: string
          id?: string
          shares_owned: number
          status?: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          bonus_shares?: number | null
          created_at?: string
          dividend_declaration_id?: string
          id?: string
          shares_owned?: number
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dividend_payments_dividend_declaration_id_fkey"
            columns: ["dividend_declaration_id"]
            isOneToOne: false
            referencedRelation: "dividend_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividend_payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_entries: {
        Row: {
          created_at: string
          credits_staked: number
          draw_id: string
          entry_number: number
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_staked: number
          draw_id: string
          entry_number: number
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_staked?: number
          draw_id?: string
          entry_number?: number
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_entries_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "grand_draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "draw_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_settings: {
        Row: {
          auto_trigger_enabled: boolean
          created_at: string
          draw_frequency: string
          first_prize_percentage: number
          id: string
          is_active: boolean
          maximum_stake: number | null
          minimum_stake: number
          second_prize_percentage: number
          third_prize_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_trigger_enabled?: boolean
          created_at?: string
          draw_frequency?: string
          first_prize_percentage?: number
          id?: string
          is_active?: boolean
          maximum_stake?: number | null
          minimum_stake?: number
          second_prize_percentage?: number
          third_prize_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_trigger_enabled?: boolean
          created_at?: string
          draw_frequency?: string
          first_prize_percentage?: number
          id?: string
          is_active?: boolean
          maximum_stake?: number | null
          minimum_stake?: number
          second_prize_percentage?: number
          third_prize_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "draw_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_winners: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          created_at: string
          credits_staked: number
          draw_id: string
          id: string
          position: number
          prize_percentage: number
          prize_shares: number
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          credits_staked: number
          draw_id: string
          id?: string
          position: number
          prize_percentage: number
          prize_shares: number
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          credits_staked?: number
          draw_id?: string
          id?: string
          position?: number
          prize_percentage?: number
          prize_shares?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "grand_draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "draw_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics: {
        Row: {
          analytics_date: string
          bounce_rate: number | null
          created_at: string
          delivery_rate: number | null
          id: string
          provider_id: string | null
          template_type: string | null
          total_bounced: number | null
          total_cost: number | null
          total_delivered: number | null
          total_failed: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          analytics_date?: string
          bounce_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          provider_id?: string | null
          template_type?: string | null
          total_bounced?: number | null
          total_cost?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          analytics_date?: string
          bounce_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          provider_id?: string | null
          template_type?: string | null
          total_bounced?: number | null
          total_cost?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_analytics_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_budget_controls: {
        Row: {
          budget_type: string
          created_at: string
          current_daily_count: number | null
          current_monthly_count: number | null
          current_spending: number | null
          id: string
          is_active: boolean
          max_budget: number
          max_emails_per_day: number | null
          max_emails_per_month: number | null
          reset_date: string | null
          updated_at: string
        }
        Insert: {
          budget_type: string
          created_at?: string
          current_daily_count?: number | null
          current_monthly_count?: number | null
          current_spending?: number | null
          id?: string
          is_active?: boolean
          max_budget?: number
          max_emails_per_day?: number | null
          max_emails_per_month?: number | null
          reset_date?: string | null
          updated_at?: string
        }
        Update: {
          budget_type?: string
          created_at?: string
          current_daily_count?: number | null
          current_monthly_count?: number | null
          current_spending?: number | null
          id?: string
          is_active?: boolean
          max_budget?: number
          max_emails_per_day?: number | null
          max_emails_per_month?: number | null
          reset_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_delivery_logs: {
        Row: {
          business_process_reference: string | null
          communication_correlation_id: string | null
          created_at: string
          delivered_at: string | null
          email_address: string
          failed_at: string | null
          id: string
          provider: string | null
          provider_response: Json | null
          sent_at: string | null
          status: string | null
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_process_reference?: string | null
          communication_correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email_address: string
          failed_at?: string | null
          id?: string
          provider?: string | null
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_process_reference?: string | null
          communication_correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email_address?: string
          failed_at?: string | null
          id?: string
          provider?: string | null
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_communication_correlation_id_fkey"
            columns: ["communication_correlation_id"]
            isOneToOne: false
            referencedRelation: "communications_unified"
            referencedColumns: ["correlation_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          id: number
          recipient: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          id?: never
          recipient: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          id?: never
          recipient?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_providers: {
        Row: {
          api_endpoint: string | null
          configuration: Json | null
          cost_per_email: number | null
          created_at: string
          daily_limit: number | null
          id: string
          is_active: boolean
          monthly_limit: number | null
          name: string
          priority: number
          provider_type: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          configuration?: Json | null
          cost_per_email?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          monthly_limit?: number | null
          name: string
          priority?: number
          provider_type: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          configuration?: Json | null
          cost_per_email?: number | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          monthly_limit?: number | null
          name?: string
          priority?: number
          provider_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_type: string
          text_content: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_type: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_type?: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_share_price_calculations: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approved_price: number | null
          auto_applied: boolean | null
          base_price_adjustment: number | null
          calculated_price: number
          calculation_date: string | null
          calculation_inputs: Json | null
          calculation_method: string
          created_at: string | null
          created_by: string | null
          dividend_impact_factor: number | null
          id: string
          market_activity_factor: number | null
          mining_profit_factor: number | null
          previous_price: number
          price_change_percent: number | null
          share_id: string
          supply_demand_factor: number | null
          volatility_adjustment: number | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_price?: number | null
          auto_applied?: boolean | null
          base_price_adjustment?: number | null
          calculated_price: number
          calculation_date?: string | null
          calculation_inputs?: Json | null
          calculation_method: string
          created_at?: string | null
          created_by?: string | null
          dividend_impact_factor?: number | null
          id?: string
          market_activity_factor?: number | null
          mining_profit_factor?: number | null
          previous_price: number
          price_change_percent?: number | null
          share_id: string
          supply_demand_factor?: number | null
          volatility_adjustment?: number | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_price?: number | null
          auto_applied?: boolean | null
          base_price_adjustment?: number | null
          calculated_price?: number
          calculation_date?: string | null
          calculation_inputs?: Json | null
          calculation_method?: string
          created_at?: string | null
          created_by?: string | null
          dividend_impact_factor?: number | null
          id?: string
          market_activity_factor?: number | null
          mining_profit_factor?: number | null
          previous_price?: number
          price_change_percent?: number | null
          share_id?: string
          supply_demand_factor?: number | null
          volatility_adjustment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_share_price_calculations_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          spread_percentage: number | null
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          spread_percentage?: number | null
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          spread_percentage?: number | null
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grand_draws: {
        Row: {
          created_at: string
          draw_date: string
          draw_name: string
          draw_type: string
          drawn_at: string | null
          drawn_by: string | null
          first_prize_percentage: number
          first_prize_shares: number | null
          first_winner_id: string | null
          id: string
          second_prize_percentage: number
          second_prize_shares: number | null
          second_winner_id: string | null
          status: string
          third_prize_percentage: number
          third_prize_shares: number | null
          third_winner_id: string | null
          total_entries: number
          total_staked_credits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          draw_date: string
          draw_name: string
          draw_type?: string
          drawn_at?: string | null
          drawn_by?: string | null
          first_prize_percentage?: number
          first_prize_shares?: number | null
          first_winner_id?: string | null
          id?: string
          second_prize_percentage?: number
          second_prize_shares?: number | null
          second_winner_id?: string | null
          status?: string
          third_prize_percentage?: number
          third_prize_shares?: number | null
          third_winner_id?: string | null
          total_entries?: number
          total_staked_credits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          draw_date?: string
          draw_name?: string
          draw_type?: string
          drawn_at?: string | null
          drawn_by?: string | null
          first_prize_percentage?: number
          first_prize_shares?: number | null
          first_winner_id?: string | null
          id?: string
          second_prize_percentage?: number
          second_prize_shares?: number | null
          second_winner_id?: string | null
          status?: string
          third_prize_percentage?: number
          third_prize_shares?: number | null
          third_winner_id?: string | null
          total_entries?: number
          total_staked_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grand_draws_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "grand_draws_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_first_winner_id_fkey"
            columns: ["first_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_first_winner_id_fkey"
            columns: ["first_winner_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "grand_draws_first_winner_id_fkey"
            columns: ["first_winner_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_first_winner_id_fkey"
            columns: ["first_winner_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_second_winner_id_fkey"
            columns: ["second_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_second_winner_id_fkey"
            columns: ["second_winner_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "grand_draws_second_winner_id_fkey"
            columns: ["second_winner_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_second_winner_id_fkey"
            columns: ["second_winner_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_third_winner_id_fkey"
            columns: ["third_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_third_winner_id_fkey"
            columns: ["third_winner_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "grand_draws_third_winner_id_fkey"
            columns: ["third_winner_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_draws_third_winner_id_fkey"
            columns: ["third_winner_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_user_invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          invitation_token: string
          status: string | null
          updated_at: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          invitation_token: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "imported_user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_user_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_user_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "imported_user_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_user_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_club_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          join_date: string | null
          member_code: string
          member_name: string
          member_type: string | null
          net_balance: number | null
          notes: string | null
          phone: string | null
          status: string | null
          total_deposits: number | null
          total_withdrawals: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          member_code: string
          member_name: string
          member_type?: string | null
          net_balance?: number | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_deposits?: number | null
          total_withdrawals?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          join_date?: string | null
          member_code?: string
          member_name?: string
          member_type?: string | null
          net_balance?: number | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_deposits?: number | null
          total_withdrawals?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "investment_club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_slides_tracking: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          last_shown_at: string | null
          show_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          last_shown_at?: string | null
          show_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          last_shown_at?: string | null
          show_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      large_holder_sell_queue: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          daily_release_limit: number | null
          id: string
          last_release_at: string | null
          market_price_at_submission: number
          processing_started_at: string | null
          queue_position: number | null
          remaining_quantity: number
          requested_price: number | null
          status: string
          submitted_at: string
          total_quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          daily_release_limit?: number | null
          id?: string
          last_release_at?: string | null
          market_price_at_submission: number
          processing_started_at?: string | null
          queue_position?: number | null
          remaining_quantity: number
          requested_price?: number | null
          status?: string
          submitted_at?: string
          total_quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          daily_release_limit?: number | null
          id?: string
          last_release_at?: string | null
          market_price_at_submission?: number
          processing_started_at?: string | null
          queue_position?: number | null
          remaining_quantity?: number
          requested_price?: number | null
          status?: string
          submitted_at?: string
          total_quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_activity_log: {
        Row: {
          activity_date: string
          average_trade_size: number
          buy_sell_ratio: number
          buy_volume: number
          created_at: string
          id: string
          price_volatility: number
          sell_volume: number
          total_buy_orders: number
          total_sell_orders: number
          updated_at: string
        }
        Insert: {
          activity_date?: string
          average_trade_size?: number
          buy_sell_ratio?: number
          buy_volume?: number
          created_at?: string
          id?: string
          price_volatility?: number
          sell_volume?: number
          total_buy_orders?: number
          total_sell_orders?: number
          updated_at?: string
        }
        Update: {
          activity_date?: string
          average_trade_size?: number
          buy_sell_ratio?: number
          buy_volume?: number
          created_at?: string
          id?: string
          price_volatility?: number
          sell_volume?: number
          total_buy_orders?: number
          total_sell_orders?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_activity_monitoring: {
        Row: {
          company_buy_volume: number | null
          created_at: string
          highest_price: number | null
          id: string
          large_holder_queue_volume: number | null
          lowest_price: number | null
          monitoring_date: string
          p2p_volume: number | null
          price_at_end: number | null
          price_at_start: number
          price_volatility: number | null
          total_buy_volume: number | null
          total_sell_volume: number | null
          trading_halts_count: number | null
          updated_at: string
        }
        Insert: {
          company_buy_volume?: number | null
          created_at?: string
          highest_price?: number | null
          id?: string
          large_holder_queue_volume?: number | null
          lowest_price?: number | null
          monitoring_date?: string
          p2p_volume?: number | null
          price_at_end?: number | null
          price_at_start: number
          price_volatility?: number | null
          total_buy_volume?: number | null
          total_sell_volume?: number | null
          trading_halts_count?: number | null
          updated_at?: string
        }
        Update: {
          company_buy_volume?: number | null
          created_at?: string
          highest_price?: number | null
          id?: string
          large_holder_queue_volume?: number | null
          lowest_price?: number | null
          monitoring_date?: string
          p2p_volume?: number | null
          price_at_end?: number | null
          price_at_start?: number
          price_volatility?: number | null
          total_buy_volume?: number | null
          total_sell_volume?: number | null
          trading_halts_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      market_price_tolerance_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          max_buy_discount_percent: number
          max_sell_premium_percent: number
          order_expiry_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_buy_discount_percent?: number
          max_sell_premium_percent?: number
          order_expiry_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_buy_discount_percent?: number
          max_sell_premium_percent?: number
          order_expiry_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_state_configs: {
        Row: {
          auto_buyback_enabled: boolean
          company_priority_percentage: number | null
          config_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          large_holder_queue_enabled: boolean
          p2p_enabled: boolean
          price_fluctuation_enabled: boolean
          schedule_enabled: boolean
          schedule_rules: Json | null
          state_type: string
          updated_at: string
        }
        Insert: {
          auto_buyback_enabled?: boolean
          company_priority_percentage?: number | null
          config_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          large_holder_queue_enabled?: boolean
          p2p_enabled?: boolean
          price_fluctuation_enabled?: boolean
          schedule_enabled?: boolean
          schedule_rules?: Json | null
          state_type: string
          updated_at?: string
        }
        Update: {
          auto_buyback_enabled?: boolean
          company_priority_percentage?: number | null
          config_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          large_holder_queue_enabled?: boolean
          p2p_enabled?: boolean
          price_fluctuation_enabled?: boolean
          schedule_enabled?: boolean
          schedule_rules?: Json | null
          state_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_state_history: {
        Row: {
          automated_change: boolean | null
          change_reason: string | null
          changed_by: string | null
          config_snapshot: Json | null
          created_at: string
          id: string
          new_state: string
          previous_state: string
        }
        Insert: {
          automated_change?: boolean | null
          change_reason?: string | null
          changed_by?: string | null
          config_snapshot?: Json | null
          created_at?: string
          id?: string
          new_state: string
          previous_state: string
        }
        Update: {
          automated_change?: boolean | null
          change_reason?: string | null
          changed_by?: string | null
          config_snapshot?: Json | null
          created_at?: string
          id?: string
          new_state?: string
          previous_state?: string
        }
        Relationships: []
      }
      media_gallery: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          file_url: string
          id: string
          is_featured: boolean | null
          media_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_url: string
          id?: string
          is_featured?: boolean | null
          media_type: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_url?: string
          id?: string
          is_featured?: boolean | null
          media_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mining_projects: {
        Row: {
          created_at: string | null
          created_by: string
          current_funding: number | null
          description: string | null
          expected_completion: string | null
          expected_returns: number | null
          id: string
          location: string | null
          name: string
          project_type: string | null
          start_date: string | null
          status: string | null
          target_funding: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          current_funding?: number | null
          description?: string | null
          expected_completion?: string | null
          expected_returns?: number | null
          id?: string
          location?: string | null
          name: string
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          target_funding: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          current_funding?: number | null
          description?: string | null
          expected_completion?: string | null
          expected_returns?: number | null
          id?: string
          location?: string | null
          name?: string
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          target_funding?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mining_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          executed_shares: number | null
          id: string
          order_type: string | null
          price: number
          shares: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          executed_shares?: number | null
          id?: string
          order_type?: string | null
          price: number
          shares: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          executed_shares?: number | null
          id?: string
          order_type?: string | null
          price?: number
          shares?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempt_count: number | null
          attempts: number | null
          blocked: boolean
          created_at: string
          email: string | null
          expires_at: string
          id: string
          is_blocked: boolean | null
          is_used: boolean | null
          max_attempts: number | null
          otp_code: string
          phone_number: string | null
          purpose: string
          sms_provider_response: Json | null
          sms_sent_at: string | null
          sms_status: string | null
          updated_at: string
          used_at: string | null
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          attempts?: number | null
          blocked?: boolean
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          is_blocked?: boolean | null
          is_used?: boolean | null
          max_attempts?: number | null
          otp_code: string
          phone_number?: string | null
          purpose: string
          sms_provider_response?: Json | null
          sms_sent_at?: string | null
          sms_status?: string | null
          updated_at?: string
          used_at?: string | null
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          attempts?: number | null
          blocked?: boolean
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          is_blocked?: boolean | null
          is_used?: boolean | null
          max_attempts?: number | null
          otp_code?: string
          phone_number?: string | null
          purpose?: string
          sms_provider_response?: Json | null
          sms_sent_at?: string | null
          sms_status?: string | null
          updated_at?: string
          used_at?: string | null
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_correlation_tracking: {
        Row: {
          correlation_id: string
          created_at: string
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          outbound_request_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          correlation_id: string
          created_at?: string
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          outbound_request_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          correlation_id?: string
          created_at?: string
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          outbound_request_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_correlation_tracking_gateway_transaction_id_fkey"
            columns: ["gateway_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_gateway_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_outbound_request_id_fkey"
            columns: ["outbound_request_id"]
            isOneToOne: false
            referencedRelation: "relworx_outbound_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_correlation_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transaction_history_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_transactions: {
        Row: {
          amount: number
          correlation_id: string | null
          created_at: string | null
          currency: string
          gateway_name: string | null
          gateway_reference: string
          gateway_response: Json | null
          gateway_transaction_id: string
          id: string
          internal_transaction_id: string | null
          payment_method: string
          phone_number: string | null
          request_metadata: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          correlation_id?: string | null
          created_at?: string | null
          currency: string
          gateway_name?: string | null
          gateway_reference: string
          gateway_response?: Json | null
          gateway_transaction_id: string
          id?: string
          internal_transaction_id?: string | null
          payment_method: string
          phone_number?: string | null
          request_metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          correlation_id?: string | null
          created_at?: string | null
          currency?: string
          gateway_name?: string | null
          gateway_reference?: string
          gateway_response?: Json | null
          gateway_transaction_id?: string
          id?: string
          internal_transaction_id?: string | null
          payment_method?: string
          phone_number?: string | null
          request_metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_internal_transaction_id_fkey"
            columns: ["internal_transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transaction_history_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_number: string | null
          created_at: string
          currency: string
          details: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          currency: string
          details?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          currency?: string
          details?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_fluctuation_controls: {
        Row: {
          circuit_breaker_enabled: boolean | null
          circuit_breaker_threshold: number | null
          cooling_period_minutes: number | null
          created_at: string
          daily_max_decrease_percent: number | null
          daily_max_increase_percent: number | null
          halt_reason: string | null
          halt_started_at: string | null
          id: string
          is_enabled: boolean
          monthly_max_decrease_percent: number | null
          monthly_max_increase_percent: number | null
          trading_halted: boolean | null
          updated_at: string
          weekly_max_decrease_percent: number | null
          weekly_max_increase_percent: number | null
        }
        Insert: {
          circuit_breaker_enabled?: boolean | null
          circuit_breaker_threshold?: number | null
          cooling_period_minutes?: number | null
          created_at?: string
          daily_max_decrease_percent?: number | null
          daily_max_increase_percent?: number | null
          halt_reason?: string | null
          halt_started_at?: string | null
          id?: string
          is_enabled?: boolean
          monthly_max_decrease_percent?: number | null
          monthly_max_increase_percent?: number | null
          trading_halted?: boolean | null
          updated_at?: string
          weekly_max_decrease_percent?: number | null
          weekly_max_increase_percent?: number | null
        }
        Update: {
          circuit_breaker_enabled?: boolean | null
          circuit_breaker_threshold?: number | null
          cooling_period_minutes?: number | null
          created_at?: string
          daily_max_decrease_percent?: number | null
          daily_max_increase_percent?: number | null
          halt_reason?: string | null
          halt_started_at?: string | null
          id?: string
          is_enabled?: boolean
          monthly_max_decrease_percent?: number | null
          monthly_max_increase_percent?: number | null
          trading_halted?: boolean | null
          updated_at?: string
          weekly_max_decrease_percent?: number | null
          weekly_max_increase_percent?: number | null
        }
        Relationships: []
      }
      profile_audit: {
        Row: {
          admin_notes: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_activation_status: string | null
          account_type: string | null
          address: string | null
          auth_created_at: string | null
          country_of_residence: string | null
          created_at: string | null
          date_of_birth: string | null
          edit_approved: boolean | null
          edit_reason: string | null
          edit_request_status: string | null
          edit_requested: boolean | null
          email: string | null
          first_login_token: string | null
          first_login_token_expires_at: string | null
          full_name: string | null
          gender: string | null
          id: string
          import_batch_id: string | null
          is_first_login: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          last_edit_request: string | null
          last_login: string | null
          last_profile_update: string | null
          login_count: number | null
          nationality: string | null
          phone: string | null
          profile_completion_percentage: number | null
          profile_picture_url: string | null
          referral_code: string | null
          referred_by: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          tin: string | null
          town_city: string | null
          updated_at: string | null
          user_role: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verification_submitted_at: string | null
        }
        Insert: {
          account_activation_status?: string | null
          account_type?: string | null
          address?: string | null
          auth_created_at?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          edit_approved?: boolean | null
          edit_reason?: string | null
          edit_request_status?: string | null
          edit_requested?: boolean | null
          email?: string | null
          first_login_token?: string | null
          first_login_token_expires_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          import_batch_id?: string | null
          is_first_login?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_edit_request?: string | null
          last_login?: string | null
          last_profile_update?: string | null
          login_count?: number | null
          nationality?: string | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          tin?: string | null
          town_city?: string | null
          updated_at?: string | null
          user_role?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_submitted_at?: string | null
        }
        Update: {
          account_activation_status?: string | null
          account_type?: string | null
          address?: string | null
          auth_created_at?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          edit_approved?: boolean | null
          edit_reason?: string | null
          edit_request_status?: string | null
          edit_requested?: boolean | null
          email?: string | null
          first_login_token?: string | null
          first_login_token_expires_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          import_batch_id?: string | null
          is_first_login?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_edit_request?: string | null
          last_login?: string | null
          last_profile_update?: string | null
          login_count?: number | null
          nationality?: string | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          tin?: string | null
          town_city?: string | null
          updated_at?: string | null
          user_role?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      project_funding: {
        Row: {
          amount: number
          confirmed_at: string | null
          currency: string
          id: string
          pledged_at: string | null
          project_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          currency?: string
          id?: string
          pledged_at?: string | null
          project_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          currency?: string
          id?: string
          pledged_at?: string | null
          project_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_funding_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mining_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_funding_allocations: {
        Row: {
          allocated_by: string
          allocation_date: string | null
          amount: number
          funding_source: string | null
          id: string
          notes: string | null
          project_id: string
        }
        Insert: {
          allocated_by: string
          allocation_date?: string | null
          amount: number
          funding_source?: string | null
          id?: string
          notes?: string | null
          project_id: string
        }
        Update: {
          allocated_by?: string
          allocation_date?: string | null
          amount?: number
          funding_source?: string | null
          id?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_funding_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_funding_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_funding_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_funding_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_funding_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mining_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string
          id: string
          progress_percentage: number | null
          project_id: string
          title: string
          update_type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          progress_percentage?: number | null
          project_id: string
          title: string
          update_type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          progress_percentage?: number | null
          project_id?: string
          title?: string
          update_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mining_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_campaigns: {
        Row: {
          bonus_amount: number | null
          bonus_currency: string | null
          bonus_shares_quantity: number | null
          budget_amount: number | null
          budget_currency: string | null
          campaign_type: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string
          discount_amount: number | null
          discount_currency: string | null
          discount_percentage: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          name: string
          priority: number | null
          promo_code: string | null
          royalty_percentage: number | null
          starts_at: string | null
          status: string | null
          target_audience: string | null
          terms_and_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bonus_amount?: number | null
          bonus_currency?: string | null
          bonus_shares_quantity?: number | null
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description: string
          discount_amount?: number | null
          discount_currency?: string | null
          discount_percentage?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          name: string
          priority?: number | null
          promo_code?: string | null
          royalty_percentage?: number | null
          starts_at?: string | null
          status?: string | null
          target_audience?: string | null
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bonus_amount?: number | null
          bonus_currency?: string | null
          bonus_shares_quantity?: number | null
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string
          discount_amount?: number | null
          discount_currency?: string | null
          discount_percentage?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          name?: string
          priority?: number | null
          promo_code?: string | null
          royalty_percentage?: number | null
          starts_at?: string | null
          status?: string | null
          target_audience?: string | null
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          bonus_percentage: number | null
          created_at: string | null
          created_by: string
          current_participants: number | null
          current_uses: number | null
          description: string | null
          end_date: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          max_uses: number | null
          metadata: Json | null
          minimum_purchase: number | null
          name: string
          offer_details: Json | null
          priority: number | null
          promo_code: string | null
          promotion_type: string | null
          start_date: string | null
          starts_at: string | null
          target_audience: string | null
          terms_and_conditions: string | null
          terms_conditions: string | null
          title: string | null
          updated_at: string | null
          value_amount: number | null
          value_currency: string | null
          value_percentage: number | null
        }
        Insert: {
          bonus_percentage?: number | null
          created_at?: string | null
          created_by: string
          current_participants?: number | null
          current_uses?: number | null
          description?: string | null
          end_date?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          max_uses?: number | null
          metadata?: Json | null
          minimum_purchase?: number | null
          name: string
          offer_details?: Json | null
          priority?: number | null
          promo_code?: string | null
          promotion_type?: string | null
          start_date?: string | null
          starts_at?: string | null
          target_audience?: string | null
          terms_and_conditions?: string | null
          terms_conditions?: string | null
          title?: string | null
          updated_at?: string | null
          value_amount?: number | null
          value_currency?: string | null
          value_percentage?: number | null
        }
        Update: {
          bonus_percentage?: number | null
          created_at?: string | null
          created_by?: string
          current_participants?: number | null
          current_uses?: number | null
          description?: string | null
          end_date?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          max_uses?: number | null
          metadata?: Json | null
          minimum_purchase?: number | null
          name?: string
          offer_details?: Json | null
          priority?: number | null
          promo_code?: string | null
          promotion_type?: string | null
          start_date?: string | null
          starts_at?: string | null
          target_audience?: string | null
          terms_and_conditions?: string | null
          terms_conditions?: string | null
          title?: string | null
          updated_at?: string | null
          value_amount?: number | null
          value_currency?: string | null
          value_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_activities: {
        Row: {
          activity_type: string
          bonus_earned: number | null
          commission_earned: number | null
          created_at: string | null
          id: string
          investment_amount: number | null
          processed_at: string | null
          program_id: string | null
          referred_id: string | null
          referrer_id: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          bonus_earned?: number | null
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          investment_amount?: number | null
          processed_at?: string | null
          program_id?: string | null
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          bonus_earned?: number | null
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          investment_amount?: number | null
          processed_at?: string | null
          program_id?: string | null
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_activities_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_activities_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "referral_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_activities_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_activities_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_activities_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_campaigns: {
        Row: {
          bonus_multiplier: number | null
          campaign_type: string | null
          created_at: string | null
          current_participants: number | null
          description: string | null
          end_date: string
          fixed_bonus_amount: number | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          spent_budget: number | null
          start_date: string
          total_budget: number | null
        }
        Insert: {
          bonus_multiplier?: number | null
          campaign_type?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          end_date: string
          fixed_bonus_amount?: number | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          spent_budget?: number | null
          start_date: string
          total_budget?: number | null
        }
        Update: {
          bonus_multiplier?: number | null
          campaign_type?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          end_date?: string
          fixed_bonus_amount?: number | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          spent_budget?: number | null
          start_date?: string
          total_budget?: number | null
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          booking_id: string | null
          booking_payment_id: string | null
          commission_amount: number
          commission_rate: number
          commission_type: string | null
          created_at: string
          currency: string
          earning_type: string
          id: string
          installment_payment_id: string | null
          is_from_installment: boolean | null
          paid_at: string | null
          referred_id: string
          referrer_id: string
          source_amount: number
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          booking_payment_id?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_type?: string | null
          created_at?: string
          currency?: string
          earning_type?: string
          id?: string
          installment_payment_id?: string | null
          is_from_installment?: boolean | null
          paid_at?: string | null
          referred_id: string
          referrer_id: string
          source_amount?: number
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          booking_payment_id?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_type?: string | null
          created_at?: string
          currency?: string
          earning_type?: string
          id?: string
          installment_payment_id?: string | null
          is_from_installment?: boolean | null
          paid_at?: string | null
          referred_id?: string
          referrer_id?: string
          source_amount?: number
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_commissions_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referred"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "share_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_booking_payment_id_fkey"
            columns: ["booking_payment_id"]
            isOneToOne: false
            referencedRelation: "share_booking_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_installment_payment_id_fkey"
            columns: ["installment_payment_id"]
            isOneToOne: false
            referencedRelation: "share_booking_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transaction_history_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_credits: {
        Row: {
          available_credits: number
          converted_credits: number
          created_at: string
          id: string
          staked_credits: number
          total_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_credits?: number
          converted_credits?: number
          created_at?: string
          id?: string
          staked_credits?: number
          total_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_credits?: number
          converted_credits?: number
          created_at?: string
          id?: string
          staked_credits?: number
          total_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_data_audit: {
        Row: {
          audit_type: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          operation_details: Json | null
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          audit_type: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation_details?: Json | null
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          audit_type?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation_details?: Json | null
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      referral_milestones: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          milestone_type: string
          name: string
          reward_type: string
          reward_value: number | null
          threshold_value: number
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          milestone_type: string
          name: string
          reward_type: string
          reward_value?: number | null
          threshold_value: number
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          milestone_type?: string
          name?: string
          reward_type?: string
          reward_value?: number | null
          threshold_value?: number
        }
        Relationships: []
      }
      referral_payouts: {
        Row: {
          commission_ids: string[]
          created_at: string | null
          currency: string
          id: string
          notes: string | null
          payout_method: string
          payout_reference: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_ids: string[]
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          payout_method: string
          payout_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_ids?: string[]
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          payout_method?: string
          payout_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_programs: {
        Row: {
          bonus_amount: number | null
          commission_rate: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_earnings_per_user: number | null
          min_investment_threshold: number | null
          name: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          bonus_amount?: number | null
          commission_rate?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_earnings_per_user?: number | null
          min_investment_threshold?: number | null
          name: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          bonus_amount?: number | null
          commission_rate?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_earnings_per_user?: number | null
          min_investment_threshold?: number | null
          name?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      referral_qualifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          qualified_at: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          qualified_at?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          qualified_at?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_qualifications_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_qualifications_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_qualifications_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_qualifications_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_qualifications_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_qualifications_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_qualifications_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_qualifications_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          setting_name: string
          setting_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_name: string
          setting_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_name?: string
          setting_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_settings_audit: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_values: Json
          old_values: Json
          setting_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values: Json
          old_values: Json
          setting_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json
          old_values?: Json
          setting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_settings_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_settings_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_settings_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_settings_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_settings_audit_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "referral_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_statistics: {
        Row: {
          achievements: Json | null
          created_at: string | null
          current_rank: number | null
          id: string
          last_activity_at: string | null
          lifetime_value: number | null
          pending_earnings: number | null
          successful_referrals: number | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json | null
          created_at?: string | null
          current_rank?: number | null
          id?: string
          last_activity_at?: string | null
          lifetime_value?: number | null
          pending_earnings?: number | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json | null
          created_at?: string | null
          current_rank?: number | null
          id?: string
          last_activity_at?: string | null
          lifetime_value?: number | null
          pending_earnings?: number | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_statistics_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_statistics_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_statistics_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_statistics_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tier_settings: {
        Row: {
          commission_percentage: number | null
          created_at: string
          credits_per_trigger: number | null
          eligibility_days: number | null
          id: string
          is_active: boolean
          kyc_completion_required: number
          level: number
          level_name: string
          reward_type: string
          shares_per_credit_trigger: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commission_percentage?: number | null
          created_at?: string
          credits_per_trigger?: number | null
          eligibility_days?: number | null
          id?: string
          is_active?: boolean
          kyc_completion_required?: number
          level: number
          level_name: string
          reward_type: string
          shares_per_credit_trigger?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commission_percentage?: number | null
          created_at?: string
          credits_per_trigger?: number | null
          eligibility_days?: number | null
          id?: string
          is_active?: boolean
          kyc_completion_required?: number
          level?: number
          level_name?: string
          reward_type?: string
          shares_per_credit_trigger?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_tier_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tier_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tier_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tier_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      relworx_outbound_requests: {
        Row: {
          correlation_id: string
          created_at: string
          error_message: string | null
          gateway_reference: string | null
          http_status_code: number | null
          id: string
          processing_time_ms: number | null
          request_payload: Json
          response_payload: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          correlation_id: string
          created_at?: string
          error_message?: string | null
          gateway_reference?: string | null
          http_status_code?: number | null
          id?: string
          processing_time_ms?: number | null
          request_payload: Json
          response_payload?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          error_message?: string | null
          gateway_reference?: string | null
          http_status_code?: number | null
          id?: string
          processing_time_ms?: number | null
          request_payload?: Json
          response_payload?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      relworx_payment_configs: {
        Row: {
          account_no: string | null
          api_key: string
          api_version: string | null
          authorized_business_accounts: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_sandbox: boolean | null
          key_name: string | null
          key_permissions: Json | null
          key_prefix: string | null
          merchant_id: string
          payment_limits: Json | null
          rate_limit_settings: Json | null
          request_payment_endpoint: string | null
          send_payment_endpoint: string | null
          supported_currencies: string[] | null
          updated_at: string | null
          webhook_secret: string
          webhook_url: string | null
        }
        Insert: {
          account_no?: string | null
          api_key: string
          api_version?: string | null
          authorized_business_accounts?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          key_name?: string | null
          key_permissions?: Json | null
          key_prefix?: string | null
          merchant_id: string
          payment_limits?: Json | null
          rate_limit_settings?: Json | null
          request_payment_endpoint?: string | null
          send_payment_endpoint?: string | null
          supported_currencies?: string[] | null
          updated_at?: string | null
          webhook_secret: string
          webhook_url?: string | null
        }
        Update: {
          account_no?: string | null
          api_key?: string
          api_version?: string | null
          authorized_business_accounts?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          key_name?: string | null
          key_permissions?: Json | null
          key_prefix?: string | null
          merchant_id?: string
          payment_limits?: Json | null
          rate_limit_settings?: Json | null
          request_payment_endpoint?: string | null
          send_payment_endpoint?: string | null
          supported_currencies?: string[] | null
          updated_at?: string | null
          webhook_secret?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      relworx_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          id: string
          phone_number: string
          request_count: number
          updated_at: string
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          phone_number: string
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      sell_order_market_protection: {
        Row: {
          auto_processing_fund_threshold: number
          created_at: string
          daily_volume_limit: number
          emergency_halt_enabled: boolean
          emergency_halt_reason: string | null
          id: string
          is_enabled: boolean
          max_daily_auto_processing_amount: number
          max_price_drop_percentage: number
          price_monitoring_window_hours: number
          updated_at: string
          updated_by: string | null
          volume_spike_threshold_multiplier: number
          weekly_volume_limit: number
        }
        Insert: {
          auto_processing_fund_threshold?: number
          created_at?: string
          daily_volume_limit?: number
          emergency_halt_enabled?: boolean
          emergency_halt_reason?: string | null
          id?: string
          is_enabled?: boolean
          max_daily_auto_processing_amount?: number
          max_price_drop_percentage?: number
          price_monitoring_window_hours?: number
          updated_at?: string
          updated_by?: string | null
          volume_spike_threshold_multiplier?: number
          weekly_volume_limit?: number
        }
        Update: {
          auto_processing_fund_threshold?: number
          created_at?: string
          daily_volume_limit?: number
          emergency_halt_enabled?: boolean
          emergency_halt_reason?: string | null
          id?: string
          is_enabled?: boolean
          max_daily_auto_processing_amount?: number
          max_price_drop_percentage?: number
          price_monitoring_window_hours?: number
          updated_at?: string
          updated_by?: string | null
          volume_spike_threshold_multiplier?: number
          weekly_volume_limit?: number
        }
        Relationships: []
      }
      sell_order_processing_batches: {
        Row: {
          batch_reference: string
          buyback_fund_used: number
          completed_at: string | null
          created_at: string
          fund_balance_after: number | null
          fund_balance_before: number | null
          id: string
          orders_count: number
          processed_by: string
          processing_settings: Json | null
          processing_type: string
          results_summary: Json | null
          started_at: string
          status: string
          total_quantity: number
          total_value: number
          updated_at: string
        }
        Insert: {
          batch_reference: string
          buyback_fund_used?: number
          completed_at?: string | null
          created_at?: string
          fund_balance_after?: number | null
          fund_balance_before?: number | null
          id?: string
          orders_count?: number
          processed_by: string
          processing_settings?: Json | null
          processing_type?: string
          results_summary?: Json | null
          started_at?: string
          status?: string
          total_quantity?: number
          total_value?: number
          updated_at?: string
        }
        Update: {
          batch_reference?: string
          buyback_fund_used?: number
          completed_at?: string | null
          created_at?: string
          fund_balance_after?: number | null
          fund_balance_before?: number | null
          id?: string
          orders_count?: number
          processed_by?: string
          processing_settings?: Json | null
          processing_type?: string
          results_summary?: Json | null
          started_at?: string
          status?: string
          total_quantity?: number
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      share_allocations: {
        Row: {
          allocation_type: string | null
          created_at: string | null
          id: string
          note: string | null
          shares: number
          updated_at: string | null
        }
        Insert: {
          allocation_type?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          shares: number
          updated_at?: string | null
        }
        Update: {
          allocation_type?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          shares?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      share_booking_payments: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          payment_amount: number
          payment_date: string
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          payment_amount: number
          payment_date?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          payment_amount?: number
          payment_date?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "share_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_booking_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_booking_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_booking_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_booking_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      share_bookings: {
        Row: {
          booked_price_per_share: number
          created_at: string
          cumulative_payments: number | null
          currency: string
          down_payment_amount: number | null
          expires_at: string
          id: string
          payment_percentage: number | null
          quantity: number
          remaining_amount: number | null
          share_id: string
          shares_owned_progressively: number | null
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booked_price_per_share: number
          created_at?: string
          cumulative_payments?: number | null
          currency: string
          down_payment_amount?: number | null
          expires_at: string
          id?: string
          payment_percentage?: number | null
          quantity: number
          remaining_amount?: number | null
          share_id: string
          shares_owned_progressively?: number | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booked_price_per_share?: number
          created_at?: string
          cumulative_payments?: number | null
          currency?: string
          down_payment_amount?: number | null
          expires_at?: string
          id?: string
          payment_percentage?: number | null
          quantity?: number
          remaining_amount?: number | null
          share_id?: string
          shares_owned_progressively?: number | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_bookings_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_buyback_orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          currency: string
          expires_at: string | null
          fifo_position: number | null
          id: string
          net_amount: number | null
          partial_payment: number | null
          payment_percentage: number | null
          quantity: number
          requested_price: number
          share_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          fifo_position?: number | null
          id?: string
          net_amount?: number | null
          partial_payment?: number | null
          payment_percentage?: number | null
          quantity: number
          requested_price: number
          share_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          fifo_position?: number | null
          id?: string
          net_amount?: number | null
          partial_payment?: number | null
          payment_percentage?: number | null
          quantity?: number
          requested_price?: number
          share_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_buyback_orders_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_buyback_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_buyback_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_buyback_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_buyback_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      share_buyback_settings: {
        Row: {
          auto_cancel_days: number | null
          buyback_fund: number | null
          created_at: string | null
          daily_limit: number | null
          id: string
          min_payment_percentage: number | null
          mode: string | null
          monthly_limit: number | null
          quarterly_limit: number | null
          updated_at: string | null
          weekly_limit: number | null
          yearly_limit: number | null
        }
        Insert: {
          auto_cancel_days?: number | null
          buyback_fund?: number | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          min_payment_percentage?: number | null
          mode?: string | null
          monthly_limit?: number | null
          quarterly_limit?: number | null
          updated_at?: string | null
          weekly_limit?: number | null
          yearly_limit?: number | null
        }
        Update: {
          auto_cancel_days?: number | null
          buyback_fund?: number | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          min_payment_percentage?: number | null
          mode?: string | null
          monthly_limit?: number | null
          quarterly_limit?: number | null
          updated_at?: string | null
          weekly_limit?: number | null
          yearly_limit?: number | null
        }
        Relationships: []
      }
      share_buying_limits: {
        Row: {
          account_type: string
          created_at: string | null
          credit_period_days: number | null
          id: string
          max_buy_amount: number
          min_buy_amount: number
          required_down_payment_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          account_type: string
          created_at?: string | null
          credit_period_days?: number | null
          id?: string
          max_buy_amount: number
          min_buy_amount: number
          required_down_payment_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string | null
          credit_period_days?: number | null
          id?: string
          max_buy_amount?: number
          min_buy_amount?: number
          required_down_payment_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      share_movements: {
        Row: {
          created_at: string | null
          from_user_id: string | null
          id: string
          movement_type: string | null
          price: number | null
          related_order_id: string | null
          shares: number
          to_user_id: string | null
          user_id: string | null
          wallet_txn_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          movement_type?: string | null
          price?: number | null
          related_order_id?: string | null
          shares: number
          to_user_id?: string | null
          user_id?: string | null
          wallet_txn_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          movement_type?: string | null
          price?: number | null
          related_order_id?: string | null
          shares?: number
          to_user_id?: string | null
          user_id?: string | null
          wallet_txn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_movements_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_movements_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      share_order_book: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          filled_quantity: number
          id: string
          market_price_at_order: number
          order_method: string
          order_type: string
          price_per_share: number
          price_tolerance_percent: number
          quantity: number
          remaining_quantity: number
          share_id: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          filled_quantity?: number
          id?: string
          market_price_at_order: number
          order_method?: string
          order_type: string
          price_per_share: number
          price_tolerance_percent?: number
          quantity: number
          remaining_quantity: number
          share_id: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          filled_quantity?: number
          id?: string
          market_price_at_order?: number
          order_method?: string
          order_type?: string
          price_per_share?: number
          price_tolerance_percent?: number
          quantity?: number
          remaining_quantity?: number
          share_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_order_fills: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          movement_id: string | null
          order_id: string | null
          shares_filled: number
          wallet_txn_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          movement_id?: string | null
          order_id?: string | null
          shares_filled: number
          wallet_txn_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          movement_id?: string | null
          order_id?: string | null
          shares_filled?: number
          wallet_txn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_order_fills_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "share_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_order_fills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "share_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      share_order_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          order_id: string | null
          status: string | null
          wallet_txn_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          wallet_txn_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          wallet_txn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "share_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      share_orders: {
        Row: {
          created_at: string | null
          id: string
          order_type: string | null
          price_per_share: number
          quantity: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_type?: string | null
          price_per_share: number
          quantity: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_type?: string | null
          price_per_share?: number
          quantity?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      share_pool_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          created_by: string | null
          id: string
          new_total: number
          previous_total: number
          quantity_changed: number
          reason: string
          share_id: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_total: number
          previous_total: number
          quantity_changed: number
          reason: string
          share_id: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_total?: number
          previous_total?: number
          quantity_changed?: number
          reason?: string
          share_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_pool_adjustments_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_pool_history: {
        Row: {
          available_shares: number
          created_at: string
          date: string
          id: string
          net_movement: number
          percentage_change: number | null
          previous_net: number | null
          price_per_share: number
          reserved_shares: number
          shares_bought_back: number
          shares_sold: number
          total_shares: number
          updated_at: string
        }
        Insert: {
          available_shares: number
          created_at?: string
          date?: string
          id?: string
          net_movement?: number
          percentage_change?: number | null
          previous_net?: number | null
          price_per_share: number
          reserved_shares: number
          shares_bought_back?: number
          shares_sold?: number
          total_shares: number
          updated_at?: string
        }
        Update: {
          available_shares?: number
          created_at?: string
          date?: string
          id?: string
          net_movement?: number
          percentage_change?: number | null
          previous_net?: number | null
          price_per_share?: number
          reserved_shares?: number
          shares_bought_back?: number
          shares_sold?: number
          total_shares?: number
          updated_at?: string
        }
        Relationships: []
      }
      share_pool_settings: {
        Row: {
          auto_rebalance_enabled: boolean | null
          created_at: string | null
          critical_stock_threshold_percent: number | null
          id: string
          low_stock_threshold_percent: number | null
          max_daily_sales_percent: number | null
          price_volatility_limit_percent: number | null
          reserve_allocation_strategy: string | null
          reserve_percentage: number | null
          share_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_rebalance_enabled?: boolean | null
          created_at?: string | null
          critical_stock_threshold_percent?: number | null
          id?: string
          low_stock_threshold_percent?: number | null
          max_daily_sales_percent?: number | null
          price_volatility_limit_percent?: number | null
          reserve_allocation_strategy?: string | null
          reserve_percentage?: number | null
          share_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_rebalance_enabled?: boolean | null
          created_at?: string | null
          critical_stock_threshold_percent?: number | null
          id?: string
          low_stock_threshold_percent?: number | null
          max_daily_sales_percent?: number | null
          price_volatility_limit_percent?: number | null
          reserve_allocation_strategy?: string | null
          reserve_percentage?: number | null
          share_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_pool_settings_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_price_calculations: {
        Row: {
          admin_notes: string | null
          buy_sell_ratio: number
          calculation_date: string
          calculation_method: string
          created_at: string
          created_by: string | null
          dividend_paid: number
          id: string
          market_activity_adjustment: number
          mining_profit: number
          new_price: number
          previous_price: number
        }
        Insert: {
          admin_notes?: string | null
          buy_sell_ratio?: number
          calculation_date?: string
          calculation_method?: string
          created_at?: string
          created_by?: string | null
          dividend_paid?: number
          id?: string
          market_activity_adjustment?: number
          mining_profit?: number
          new_price: number
          previous_price: number
        }
        Update: {
          admin_notes?: string | null
          buy_sell_ratio?: number
          calculation_date?: string
          calculation_method?: string
          created_at?: string
          created_by?: string | null
          dividend_paid?: number
          id?: string
          market_activity_adjustment?: number
          mining_profit?: number
          new_price?: number
          previous_price?: number
        }
        Relationships: []
      }
      share_price_history: {
        Row: {
          admin_notes: string | null
          calculation_factors: Json | null
          calculation_method: string
          created_at: string
          currency: string
          date: string
          id: string
          previous_price: number | null
          price_change_percent: number | null
          price_per_share: number
          share_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          calculation_factors?: Json | null
          calculation_method?: string
          created_at?: string
          currency?: string
          date?: string
          id?: string
          previous_price?: number | null
          price_change_percent?: number | null
          price_per_share: number
          share_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          calculation_factors?: Json | null
          calculation_method?: string
          created_at?: string
          currency?: string
          date?: string
          id?: string
          previous_price?: number | null
          price_change_percent?: number | null
          price_per_share?: number
          share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_price_history_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_prices: {
        Row: {
          created_at: string | null
          effective_from: string | null
          id: string
          price: number
          source: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          price: number
          source?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          price?: number
          source?: string | null
        }
        Relationships: []
      }
      share_purchase_orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          exchange_details: Json | null
          id: string
          otp_verified: boolean | null
          payment_source: string | null
          price_per_share: number
          quantity: number
          share_id: string
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          exchange_details?: Json | null
          id?: string
          otp_verified?: boolean | null
          payment_source?: string | null
          price_per_share: number
          quantity: number
          share_id: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          exchange_details?: Json | null
          id?: string
          otp_verified?: boolean | null
          payment_source?: string | null
          price_per_share?: number
          quantity?: number
          share_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      share_reserve_allocations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          percentage: number
          purpose: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          percentage: number
          purpose: string
          quantity: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          percentage?: number
          purpose?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      share_reserve_tracking: {
        Row: {
          allocated_quantity: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          remaining_quantity: number
          reserve_type: string
          updated_at: string
          used_quantity: number
        }
        Insert: {
          allocated_quantity: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          remaining_quantity: number
          reserve_type: string
          updated_at?: string
          used_quantity?: number
        }
        Update: {
          allocated_quantity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          remaining_quantity?: number
          reserve_type?: string
          updated_at?: string
          used_quantity?: number
        }
        Relationships: []
      }
      share_sell_order_modifications: {
        Row: {
          created_at: string
          created_by: string
          fifo_position_after: number | null
          fifo_position_before: number | null
          id: string
          modification_type: string
          new_values: Json
          old_values: Json
          order_id: string
          processed_at: string[] | null
          queue_reset: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fifo_position_after?: number | null
          fifo_position_before?: number | null
          id?: string
          modification_type: string
          new_values: Json
          old_values: Json
          order_id: string
          processed_at?: string[] | null
          queue_reset?: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fifo_position_after?: number | null
          fifo_position_before?: number | null
          id?: string
          modification_type?: string
          new_values?: Json
          old_values?: Json
          order_id?: string
          processed_at?: string[] | null
          queue_reset?: boolean
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_sell_order_modifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "share_sell_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      share_sell_orders: {
        Row: {
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          current_market_price: number | null
          estimated_fees: number | null
          expires_at: string | null
          fifo_position: number | null
          id: string
          last_modified_at: string | null
          last_partial_processing_at: string | null
          market_conditions_at_submission: Json | null
          modification_count: number
          net_proceeds: number | null
          order_type: string
          original_quantity: number
          price_impact_assessment: Json | null
          priority_level: number
          processed_at: string | null
          processed_by: string | null
          processed_quantity: number
          processing_batch_id: string | null
          processing_notes: string | null
          quantity: number
          remaining_quantity: number
          requested_price: number
          share_id: string
          status: string
          total_sell_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          current_market_price?: number | null
          estimated_fees?: number | null
          expires_at?: string | null
          fifo_position?: number | null
          id?: string
          last_modified_at?: string | null
          last_partial_processing_at?: string | null
          market_conditions_at_submission?: Json | null
          modification_count?: number
          net_proceeds?: number | null
          order_type?: string
          original_quantity: number
          price_impact_assessment?: Json | null
          priority_level?: number
          processed_at?: string | null
          processed_by?: string | null
          processed_quantity?: number
          processing_batch_id?: string | null
          processing_notes?: string | null
          quantity: number
          remaining_quantity: number
          requested_price: number
          share_id: string
          status?: string
          total_sell_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          current_market_price?: number | null
          estimated_fees?: number | null
          expires_at?: string | null
          fifo_position?: number | null
          id?: string
          last_modified_at?: string | null
          last_partial_processing_at?: string | null
          market_conditions_at_submission?: Json | null
          modification_count?: number
          net_proceeds?: number | null
          order_type?: string
          original_quantity?: number
          price_impact_assessment?: Json | null
          priority_level?: number
          processed_at?: string | null
          processed_by?: string | null
          processed_quantity?: number
          processing_batch_id?: string | null
          processing_notes?: string | null
          quantity?: number
          remaining_quantity?: number
          requested_price?: number
          share_id?: string
          status?: string
          total_sell_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_share_sell_orders_share_id"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_selling_limits: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          limit_type: string
          limit_value: number
          period_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          limit_type: string
          limit_value: number
          period_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          limit_type?: string
          limit_value?: number
          period_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      share_selling_limits_by_account: {
        Row: {
          account_type: string
          created_at: string
          daily_limit: number
          id: string
          is_active: boolean
          limit_type: string
          monthly_limit: number
          updated_at: string
          weekly_limit: number
        }
        Insert: {
          account_type: string
          created_at?: string
          daily_limit?: number
          id?: string
          is_active?: boolean
          limit_type: string
          monthly_limit?: number
          updated_at?: string
          weekly_limit?: number
        }
        Update: {
          account_type?: string
          created_at?: string
          daily_limit?: number
          id?: string
          is_active?: boolean
          limit_type?: string
          monthly_limit?: number
          updated_at?: string
          weekly_limit?: number
        }
        Relationships: []
      }
      share_selling_rules: {
        Row: {
          account_type: string
          created_at: string
          daily_sell_limit: number
          id: string
          installment_allowed: boolean
          is_active: boolean
          max_installment_period_days: number | null
          max_sell_amount: number
          min_down_payment_percent: number | null
          min_installment_period_days: number | null
          min_sell_amount: number
          monthly_sell_limit: number
          updated_at: string
          weekly_sell_limit: number
        }
        Insert: {
          account_type: string
          created_at?: string
          daily_sell_limit?: number
          id?: string
          installment_allowed?: boolean
          is_active?: boolean
          max_installment_period_days?: number | null
          max_sell_amount?: number
          min_down_payment_percent?: number | null
          min_installment_period_days?: number | null
          min_sell_amount?: number
          monthly_sell_limit?: number
          updated_at?: string
          weekly_sell_limit?: number
        }
        Update: {
          account_type?: string
          created_at?: string
          daily_sell_limit?: number
          id?: string
          installment_allowed?: boolean
          is_active?: boolean
          max_installment_period_days?: number | null
          max_sell_amount?: number
          min_down_payment_percent?: number | null
          min_installment_period_days?: number | null
          min_sell_amount?: number
          monthly_sell_limit?: number
          updated_at?: string
          weekly_sell_limit?: number
        }
        Relationships: []
      }
      share_stock_movements: {
        Row: {
          admin_id: string | null
          booking_id: string | null
          created_at: string
          currency: string
          description: string | null
          destination_bucket: string | null
          id: string
          metadata: Json | null
          movement_type: string
          order_id: string | null
          price_per_share: number | null
          processed_at: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          share_id: string
          source_bucket: string | null
          status: string
          total_value: number | null
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination_bucket?: string | null
          id?: string
          metadata?: Json | null
          movement_type: string
          order_id?: string | null
          price_per_share?: number | null
          processed_at?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          share_id: string
          source_bucket?: string | null
          status?: string
          total_value?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination_bucket?: string | null
          id?: string
          metadata?: Json | null
          movement_type?: string
          order_id?: string | null
          price_per_share?: number | null
          processed_at?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          share_id?: string
          source_bucket?: string | null
          status?: string
          total_value?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_stock_movements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_stock_movements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      share_trading_limits: {
        Row: {
          created_at: string | null
          daily_sell_limit: number | null
          id: string
          max_buy_amount: number | null
          min_buy_amount: number | null
          monthly_sell_limit: number | null
          transfer_fee_percentage: number | null
          transfer_flat_fee: number | null
          updated_at: string | null
          weekly_sell_limit: number | null
        }
        Insert: {
          created_at?: string | null
          daily_sell_limit?: number | null
          id?: string
          max_buy_amount?: number | null
          min_buy_amount?: number | null
          monthly_sell_limit?: number | null
          transfer_fee_percentage?: number | null
          transfer_flat_fee?: number | null
          updated_at?: string | null
          weekly_sell_limit?: number | null
        }
        Update: {
          created_at?: string | null
          daily_sell_limit?: number | null
          id?: string
          max_buy_amount?: number | null
          min_buy_amount?: number | null
          monthly_sell_limit?: number | null
          transfer_fee_percentage?: number | null
          transfer_flat_fee?: number | null
          updated_at?: string | null
          weekly_sell_limit?: number | null
        }
        Relationships: []
      }
      share_transactions: {
        Row: {
          agent_id: string | null
          created_at: string
          currency: string
          id: string
          price_per_share: number
          quantity: number
          recipient_id: string | null
          share_id: string
          source: string | null
          status: string
          total_amount: number | null
          transaction_id: string | null
          transaction_type: string
          transfer_fee: number | null
          transfer_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          currency: string
          id?: string
          price_per_share: number
          quantity: number
          recipient_id?: string | null
          share_id: string
          source?: string | null
          status?: string
          total_amount?: number | null
          transaction_id?: string | null
          transaction_type: string
          transfer_fee?: number | null
          transfer_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          price_per_share?: number
          quantity?: number
          recipient_id?: string | null
          share_id?: string
          source?: string | null
          status?: string
          total_amount?: number | null
          transaction_id?: string | null
          transaction_type?: string
          transfer_fee?: number | null
          transfer_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_transactions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_transfer_fee_settings: {
        Row: {
          base_percentage: number | null
          created_at: string | null
          currency: string | null
          flat_fee: number | null
          id: string
          is_active: boolean | null
          maximum_fee: number | null
          minimum_fee: number | null
          updated_at: string | null
          vip_user_discount: number | null
          volume_discount_tiers: Json | null
        }
        Insert: {
          base_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          updated_at?: string | null
          vip_user_discount?: number | null
          volume_discount_tiers?: Json | null
        }
        Update: {
          base_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          updated_at?: string | null
          vip_user_discount?: number | null
          volume_discount_tiers?: Json | null
        }
        Relationships: []
      }
      share_transfer_limits_by_account: {
        Row: {
          account_type: string
          created_at: string
          daily_limit_shares: number
          id: string
          is_active: boolean
          minimum_transfer_value: number
          monthly_limit_shares: number
          updated_at: string
          weekly_limit_shares: number
        }
        Insert: {
          account_type: string
          created_at?: string
          daily_limit_shares?: number
          id?: string
          is_active?: boolean
          minimum_transfer_value?: number
          monthly_limit_shares?: number
          updated_at?: string
          weekly_limit_shares?: number
        }
        Update: {
          account_type?: string
          created_at?: string
          daily_limit_shares?: number
          id?: string
          is_active?: boolean
          minimum_transfer_value?: number
          monthly_limit_shares?: number
          updated_at?: string
          weekly_limit_shares?: number
        }
        Relationships: []
      }
      share_transfer_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          auto_approved: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          processed_by: string | null
          quantity: number
          reason: string | null
          recipient_balance_after: number | null
          recipient_balance_before: number | null
          recipient_id: string
          sender_balance_after: number | null
          sender_balance_before: number | null
          sender_id: string
          share_id: string
          share_price: number
          status: string
          transfer_fee: number
          transfer_value: number
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          processed_by?: string | null
          quantity: number
          reason?: string | null
          recipient_balance_after?: number | null
          recipient_balance_before?: number | null
          recipient_id: string
          sender_balance_after?: number | null
          sender_balance_before?: number | null
          sender_id: string
          share_id: string
          share_price: number
          status?: string
          transfer_fee?: number
          transfer_value: number
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          processed_by?: string | null
          quantity?: number
          reason?: string | null
          recipient_balance_after?: number | null
          recipient_balance_before?: number | null
          recipient_id?: string
          sender_balance_after?: number | null
          sender_balance_before?: number | null
          sender_id?: string
          share_id?: string
          share_price?: number
          status?: string
          transfer_fee?: number
          transfer_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_transfer_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_transfer_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_transfer_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_transfer_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_requests_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_type_configurations: {
        Row: {
          created_at: string | null
          default_dividend_eligible: boolean | null
          default_transfer_restrictions: Json | null
          default_voting_rights: boolean | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          maximum_holding_multiplier: number | null
          minimum_investment_multiplier: number | null
          priority_order: number | null
          share_category: string
          share_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_dividend_eligible?: boolean | null
          default_transfer_restrictions?: Json | null
          default_voting_rights?: boolean | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          maximum_holding_multiplier?: number | null
          minimum_investment_multiplier?: number | null
          priority_order?: number | null
          share_category: string
          share_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_dividend_eligible?: boolean | null
          default_transfer_restrictions?: Json | null
          default_voting_rights?: boolean | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          maximum_holding_multiplier?: number | null
          minimum_investment_multiplier?: number | null
          priority_order?: number | null
          share_category?: string
          share_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shares: {
        Row: {
          available_shares: number
          buy_back_fund: number | null
          buy_back_limit: number | null
          buy_back_mode: string | null
          created_at: string
          currency: string
          current_price: number | null
          description: string | null
          dividend_eligible: boolean | null
          id: string
          initial_price: number | null
          last_price_calculation_date: string | null
          maximum_individual_holding: number | null
          minimum_investment: number | null
          name: string
          price_calculation_method: string | null
          price_calculation_mode: string | null
          price_per_share: number
          pricing_metadata: Json | null
          reserve_allocated_shares: number | null
          reserve_issued_shares: number | null
          reserve_rate_percent: number | null
          reserved_issued: number | null
          reserved_shares: number | null
          share_category: string | null
          share_type: string | null
          start_date: string | null
          total_shares: number
          transfer_restrictions: Json | null
          updated_at: string
          voting_rights: boolean | null
        }
        Insert: {
          available_shares: number
          buy_back_fund?: number | null
          buy_back_limit?: number | null
          buy_back_mode?: string | null
          created_at?: string
          currency?: string
          current_price?: number | null
          description?: string | null
          dividend_eligible?: boolean | null
          id?: string
          initial_price?: number | null
          last_price_calculation_date?: string | null
          maximum_individual_holding?: number | null
          minimum_investment?: number | null
          name: string
          price_calculation_method?: string | null
          price_calculation_mode?: string | null
          price_per_share: number
          pricing_metadata?: Json | null
          reserve_allocated_shares?: number | null
          reserve_issued_shares?: number | null
          reserve_rate_percent?: number | null
          reserved_issued?: number | null
          reserved_shares?: number | null
          share_category?: string | null
          share_type?: string | null
          start_date?: string | null
          total_shares: number
          transfer_restrictions?: Json | null
          updated_at?: string
          voting_rights?: boolean | null
        }
        Update: {
          available_shares?: number
          buy_back_fund?: number | null
          buy_back_limit?: number | null
          buy_back_mode?: string | null
          created_at?: string
          currency?: string
          current_price?: number | null
          description?: string | null
          dividend_eligible?: boolean | null
          id?: string
          initial_price?: number | null
          last_price_calculation_date?: string | null
          maximum_individual_holding?: number | null
          minimum_investment?: number | null
          name?: string
          price_calculation_method?: string | null
          price_calculation_mode?: string | null
          price_per_share?: number
          pricing_metadata?: Json | null
          reserve_allocated_shares?: number | null
          reserve_issued_shares?: number | null
          reserve_rate_percent?: number | null
          reserved_issued?: number | null
          reserved_shares?: number | null
          share_category?: string | null
          share_type?: string | null
          start_date?: string | null
          total_shares?: number
          transfer_restrictions?: Json | null
          updated_at?: string
          voting_rights?: boolean | null
        }
        Relationships: []
      }
      shares_pool: {
        Row: {
          available: number | null
          created_at: string | null
          id: string
          reserved: number | null
          total_issued: number | null
          updated_at: string | null
        }
        Insert: {
          available?: number | null
          created_at?: string | null
          id?: string
          reserved?: number | null
          total_issued?: number | null
          updated_at?: string | null
        }
        Update: {
          available?: number | null
          created_at?: string | null
          id?: string
          reserved?: number | null
          total_issued?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_analytics: {
        Row: {
          avg_delivery_time_seconds: number
          created_at: string
          date: string
          id: string
          provider_id: string | null
          success_rate: number
          total_cost: number
          total_delivered: number
          total_failed: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          avg_delivery_time_seconds?: number
          created_at?: string
          date: string
          id?: string
          provider_id?: string | null
          success_rate?: number
          total_cost?: number
          total_delivered?: number
          total_failed?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          avg_delivery_time_seconds?: number
          created_at?: string
          date?: string
          id?: string
          provider_id?: string | null
          success_rate?: number
          total_cost?: number
          total_delivered?: number
          total_failed?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_analytics_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "sms_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_budget_controls: {
        Row: {
          alert_threshold_percent: number
          budget_name: string
          created_at: string
          current_day_spent: number
          current_month_spent: number
          daily_budget_limit: number
          id: string
          is_active: boolean
          monthly_budget_limit: number
          updated_at: string
        }
        Insert: {
          alert_threshold_percent?: number
          budget_name: string
          created_at?: string
          current_day_spent?: number
          current_month_spent?: number
          daily_budget_limit: number
          id?: string
          is_active?: boolean
          monthly_budget_limit: number
          updated_at?: string
        }
        Update: {
          alert_threshold_percent?: number
          budget_name?: string
          created_at?: string
          current_day_spent?: number
          current_month_spent?: number
          daily_budget_limit?: number
          id?: string
          is_active?: boolean
          monthly_budget_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sms_delivery_logs: {
        Row: {
          business_process_reference: string | null
          communication_correlation_id: string | null
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          id: string
          otp_id: string | null
          phone_number: string
          provider: string | null
          provider_response: Json | null
          sent_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_process_reference?: string | null
          communication_correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          otp_id?: string | null
          phone_number: string
          provider?: string | null
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_process_reference?: string | null
          communication_correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          otp_id?: string | null
          phone_number?: string
          provider?: string | null
          provider_response?: Json | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_delivery_logs_communication_correlation_id_fkey"
            columns: ["communication_correlation_id"]
            isOneToOne: false
            referencedRelation: "communications_unified"
            referencedColumns: ["correlation_id"]
          },
          {
            foreignKeyName: "sms_delivery_logs_otp_id_fkey"
            columns: ["otp_id"]
            isOneToOne: false
            referencedRelation: "otp_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          created_at: string | null
          id: number
          message: string
          phone_number: string
          response: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          message: string
          phone_number: string
          response?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          message?: string
          phone_number?: string
          response?: string | null
          status?: string | null
        }
        Relationships: []
      }
      sms_providers: {
        Row: {
          api_endpoint: string
          avg_delivery_time_seconds: number
          configuration: Json
          cost_per_sms: number
          created_at: string
          id: string
          is_active: boolean
          priority_order: number
          provider_name: string
          provider_type: string
          rate_limit_per_minute: number
          retry_attempts: number
          success_rate: number
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          api_endpoint: string
          avg_delivery_time_seconds?: number
          configuration?: Json
          cost_per_sms?: number
          created_at?: string
          id?: string
          is_active?: boolean
          priority_order?: number
          provider_name: string
          provider_type: string
          rate_limit_per_minute?: number
          retry_attempts?: number
          success_rate?: number
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          api_endpoint?: string
          avg_delivery_time_seconds?: number
          configuration?: Json
          cost_per_sms?: number
          created_at?: string
          id?: string
          is_active?: boolean
          priority_order?: number
          provider_name?: string
          provider_type?: string
          rate_limit_per_minute?: number
          retry_attempts?: number
          success_rate?: number
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_rate_limits: {
        Row: {
          attempts_count: number | null
          created_at: string
          id: string
          max_attempts: number | null
          phone_number: string
          updated_at: string
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          phone_number: string
          updated_at?: string
          user_id: string
          window_end: string
          window_start: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string
          id?: string
          max_attempts?: number | null
          phone_number?: string
          updated_at?: string
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          message_template: string
          purpose: string
          template_category: string
          template_name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          message_template: string
          purpose: string
          template_category: string
          template_name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          message_template?: string
          purpose?: string
          template_category?: string
          template_name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_active: boolean | null
          platform: string
          platform_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          platform: string
          platform_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          platform_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transaction_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          details: Json | null
          id: string
          ip_address: string | null
          transaction_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_audit_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "agent_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "share_transactions_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_transaction_history_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_fee_collections: {
        Row: {
          created_at: string | null
          currency: string | null
          fee_amount: number | null
          fee_percentage: number | null
          flat_fee: number | null
          id: string
          transaction_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          flat_fee?: number | null
          id?: string
          transaction_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          flat_fee?: number | null
          id?: string
          transaction_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transaction_fee_settings: {
        Row: {
          created_at: string | null
          currency: string
          fee_collection_enabled: boolean | null
          fee_type: string | null
          flat_fee: number
          id: string
          is_active: boolean | null
          maximum_fee: number | null
          minimum_fee: number | null
          percentage_fee: number
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          fee_collection_enabled?: boolean | null
          fee_type?: string | null
          flat_fee?: number
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          percentage_fee?: number
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          fee_collection_enabled?: boolean | null
          fee_type?: string | null
          flat_fee?: number
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          percentage_fee?: number
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_notes: string | null
          agent_id: string | null
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          correlation_id: string | null
          created_at: string
          currency: string
          description: string | null
          exchange_rate: number | null
          external_reference: string | null
          fee_amount: number | null
          fee_percentage: number | null
          flat_fee: number | null
          gateway_reference: string | null
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          original_amount: number | null
          original_currency: string | null
          payment_gateway: string | null
          processing_batch_id: string | null
          reconciliation_status: string | null
          reference: string | null
          related_transaction_id: string | null
          request_metadata: Json | null
          settlement_date: string | null
          share_id: string | null
          source_type: string | null
          source_wallet_id: string | null
          status: string
          target_type: string | null
          target_wallet_id: string | null
          transaction_category: string | null
          transaction_type: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          agent_id?: string | null
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          correlation_id?: string | null
          created_at?: string
          currency: string
          description?: string | null
          exchange_rate?: number | null
          external_reference?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          flat_fee?: number | null
          gateway_reference?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          original_currency?: string | null
          payment_gateway?: string | null
          processing_batch_id?: string | null
          reconciliation_status?: string | null
          reference?: string | null
          related_transaction_id?: string | null
          request_metadata?: Json | null
          settlement_date?: string | null
          share_id?: string | null
          source_type?: string | null
          source_wallet_id?: string | null
          status?: string
          target_type?: string | null
          target_wallet_id?: string | null
          transaction_category?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          agent_id?: string | null
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          external_reference?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          flat_fee?: number | null
          gateway_reference?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          original_currency?: string | null
          payment_gateway?: string | null
          processing_batch_id?: string | null
          reconciliation_status?: string | null
          reference?: string | null
          related_transaction_id?: string | null
          request_metadata?: Json | null
          settlement_date?: string | null
          share_id?: string | null
          source_type?: string | null
          source_wallet_id?: string | null
          status?: string
          target_type?: string | null
          target_wallet_id?: string | null
          transaction_category?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_wallet"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_approval_settings: {
        Row: {
          auto_approve_family_transfers: boolean | null
          auto_approve_under_value: number | null
          auto_approve_verified_users: boolean | null
          cooling_period_hours: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_daily_transfers_per_user: number | null
          updated_at: string | null
        }
        Insert: {
          auto_approve_family_transfers?: boolean | null
          auto_approve_under_value?: number | null
          auto_approve_verified_users?: boolean | null
          cooling_period_hours?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_transfers_per_user?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_approve_family_transfers?: boolean | null
          auto_approve_under_value?: number | null
          auto_approve_verified_users?: boolean | null
          cooling_period_hours?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_transfers_per_user?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transfer_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          title: string
          transfer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          title: string
          transfer_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          title?: string
          transfer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_notifications_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "share_transfer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transfer_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_auth: {
        Row: {
          created_at: string
          google_auth_enabled: boolean
          google_auth_secret: string | null
          id: string
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_auth_enabled?: boolean
          google_auth_secret?: string | null
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_auth_enabled?: boolean
          google_auth_secret?: string | null
          id?: string
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_audit_log: {
        Row: {
          action_type: string
          admin_id: string | null
          change_summary: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          change_summary?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          change_summary?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          document_number: string | null
          feedback: string | null
          id: string
          status: Database["public"]["Enums"]["document_status"] | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          uploaded_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          document_number?: string | null
          feedback?: string | null
          id?: string
          status?: Database["public"]["Enums"]["document_status"] | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          document_number?: string | null
          feedback?: string | null
          id?: string
          status?: Database["public"]["Enums"]["document_status"] | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_edit_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          request_type: string
          requested_changes: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          request_type: string
          requested_changes?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          requested_changes?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_status: {
        Row: {
          completed_steps: string[] | null
          created_at: string | null
          current_step: string
          id: string
          is_imported_user: boolean | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          profile_completion_guided: boolean | null
          updated_at: string | null
          user_id: string
          verification_guidance_shown: boolean | null
          welcome_message_shown: boolean | null
        }
        Insert: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string
          id?: string
          is_imported_user?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          profile_completion_guided?: boolean | null
          updated_at?: string | null
          user_id: string
          verification_guidance_shown?: boolean | null
          welcome_message_shown?: boolean | null
        }
        Update: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string
          id?: string
          is_imported_user?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          profile_completion_guided?: boolean | null
          updated_at?: string | null
          user_id?: string
          verification_guidance_shown?: boolean | null
          welcome_message_shown?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pins: {
        Row: {
          created_at: string | null
          failed_attempts: number | null
          id: string
          locked_until: string | null
          pin_hash: string
          salt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_until?: string | null
          pin_hash: string
          salt: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_until?: string | null
          pin_hash?: string
          salt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_promotion_participations: {
        Row: {
          bonus_received: number | null
          id: string
          participated_at: string | null
          promotion_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          bonus_received?: number | null
          id?: string
          participated_at?: string | null
          promotion_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          bonus_received?: number | null
          id?: string
          participated_at?: string | null
          promotion_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promotion_participations_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotion_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotion_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_promotion_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotion_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_selling_usage: {
        Row: {
          created_at: string | null
          id: string
          order_type: string
          quantity: number
          share_id: string
          updated_at: string | null
          usage_date: string
          usage_period: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_type?: string
          quantity?: number
          share_id: string
          updated_at?: string | null
          usage_date: string
          usage_period: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_type?: string
          quantity?: number
          share_id?: string
          updated_at?: string | null
          usage_date?: string
          usage_period?: string
          user_id?: string
        }
        Relationships: []
      }
      user_share_holdings: {
        Row: {
          average_buy_price: number
          created_at: string
          id: string
          is_locked: boolean | null
          purchase_price: number | null
          quantity: number
          realized_gains: number
          share_id: string
          total_invested: number
          unrealized_gains: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_buy_price: number
          created_at?: string
          id?: string
          is_locked?: boolean | null
          purchase_price?: number | null
          quantity: number
          realized_gains?: number
          share_id: string
          total_invested: number
          unrealized_gains?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_buy_price?: number
          created_at?: string
          id?: string
          is_locked?: boolean | null
          purchase_price?: number | null
          quantity?: number
          realized_gains?: number
          share_id?: string
          total_invested?: number
          unrealized_gains?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_share_holdings_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_share_status_history: {
        Row: {
          batch_operation_id: string | null
          change_reason: string | null
          changed_by: string | null
          created_at: string
          grace_period_ends_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["share_status"]
          old_status: Database["public"]["Enums"]["share_status"] | null
          user_share_id: string
        }
        Insert: {
          batch_operation_id?: string | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          grace_period_ends_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["share_status"]
          old_status?: Database["public"]["Enums"]["share_status"] | null
          user_share_id: string
        }
        Update: {
          batch_operation_id?: string | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          grace_period_ends_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["share_status"]
          old_status?: Database["public"]["Enums"]["share_status"] | null
          user_share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_share_status_history_user_share_id_fkey"
            columns: ["user_share_id"]
            isOneToOne: false
            referencedRelation: "user_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_shares: {
        Row: {
          booking_id: string | null
          created_at: string
          currency: string
          grace_period_ends_at: string | null
          id: string
          purchase_price_per_share: number
          quantity: number
          share_id: string
          status: Database["public"]["Enums"]["share_status"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          currency: string
          grace_period_ends_at?: string | null
          id?: string
          purchase_price_per_share: number
          quantity: number
          share_id: string
          status?: Database["public"]["Enums"]["share_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          currency?: string
          grace_period_ends_at?: string | null
          id?: string
          purchase_price_per_share?: number
          quantity?: number
          share_id?: string
          status?: Database["public"]["Enums"]["share_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shares_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "share_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_shares_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verification_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          documents_complete: boolean | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          documents_complete?: boolean | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          documents_complete?: boolean | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          option_id: string
          proposal_id: string
          shares_weight: number
          user_agent: string | null
          user_id: string
          vote_choice: Database["public"]["Enums"]["vote_choice"] | null
          vote_hash: string | null
          voted_at: string | null
          voting_power: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          option_id: string
          proposal_id: string
          shares_weight: number
          user_agent?: string | null
          user_id: string
          vote_choice?: Database["public"]["Enums"]["vote_choice"] | null
          vote_hash?: string | null
          voted_at?: string | null
          voting_power?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          option_id?: string
          proposal_id?: string
          shares_weight?: number
          user_agent?: string | null
          user_id?: string
          vote_choice?: Database["public"]["Enums"]["vote_choice"] | null
          vote_hash?: string | null
          voted_at?: string | null
          voting_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "voting_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "voting_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallet_limits: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          daily_deposit_limit: number | null
          daily_withdraw_limit: number | null
          id: string
          is_suspended: boolean
          monthly_deposit_limit: number | null
          monthly_withdraw_limit: number | null
          suspension_reason: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          daily_deposit_limit?: number | null
          daily_withdraw_limit?: number | null
          id?: string
          is_suspended?: boolean
          monthly_deposit_limit?: number | null
          monthly_withdraw_limit?: number | null
          suspension_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          daily_deposit_limit?: number | null
          daily_withdraw_limit?: number | null
          id?: string
          is_suspended?: boolean
          monthly_deposit_limit?: number | null
          monthly_withdraw_limit?: number | null
          suspension_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallet_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          currency: string
          id: string
          payment_method: string | null
          recipient_email: string | null
          recipient_id: string | null
          request_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          payment_method?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          request_type: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          payment_method?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          request_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallet_statistics: {
        Row: {
          created_at: string | null
          id: string
          last_transaction_date: string | null
          total_deposits: number | null
          total_share_purchases: number | null
          total_transfers_received: number | null
          total_transfers_sent: number | null
          total_withdrawals: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_transaction_date?: string | null
          total_deposits?: number | null
          total_share_purchases?: number | null
          total_transfers_received?: number | null
          total_transfers_sent?: number | null
          total_withdrawals?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_transaction_date?: string | null
          total_deposits?: number | null
          total_share_purchases?: number | null
          total_transfers_received?: number | null
          total_transfers_sent?: number | null
          total_withdrawals?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_activation_status: string | null
          account_type: string | null
          address: string | null
          auth_created_at: string | null
          country_of_residence: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_login_token: string | null
          first_login_token_expires_at: string | null
          full_name: string | null
          gender: string | null
          id: string
          import_batch_id: string | null
          is_first_login: boolean | null
          last_login: string | null
          last_profile_update: string | null
          login_count: number | null
          national_id: string | null
          nationality: string | null
          password_hash: string | null
          phone: string | null
          profile_completion_percentage: number | null
          profile_picture_url: string | null
          referral_code: string | null
          referred_by: string | null
          status: string | null
          updated_at: string | null
          user_role: string | null
          verification_submitted_at: string | null
        }
        Insert: {
          account_activation_status?: string | null
          account_type?: string | null
          address?: string | null
          auth_created_at?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_login_token?: string | null
          first_login_token_expires_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          import_batch_id?: string | null
          is_first_login?: boolean | null
          last_login?: string | null
          last_profile_update?: string | null
          login_count?: number | null
          national_id?: string | null
          nationality?: string | null
          password_hash?: string | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_role?: string | null
          verification_submitted_at?: string | null
        }
        Update: {
          account_activation_status?: string | null
          account_type?: string | null
          address?: string | null
          auth_created_at?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_login_token?: string | null
          first_login_token_expires_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          import_batch_id?: string | null
          is_first_login?: boolean | null
          last_login?: string | null
          last_profile_update?: string | null
          login_count?: number | null
          national_id?: string | null
          nationality?: string | null
          password_hash?: string | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_role?: string | null
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      verification_section_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          rejection_reason: string | null
          section_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          section_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          section_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_submissions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          proposal_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          proposal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          proposal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voting_audit_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "voting_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_eligibility_rules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          minimum_account_age_days: number
          minimum_holding_period_days: number
          minimum_shares: number
          proposal_type: string | null
          requires_verification: boolean
          rule_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          minimum_account_age_days?: number
          minimum_holding_period_days?: number
          minimum_shares?: number
          proposal_type?: string | null
          requires_verification?: boolean
          rule_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          minimum_account_age_days?: number
          minimum_holding_period_days?: number
          minimum_shares?: number
          proposal_type?: string | null
          requires_verification?: boolean
          rule_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      voting_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_type: string
          proposal_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type: string
          proposal_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          proposal_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voting_notifications_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "voting_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_options: {
        Row: {
          created_at: string | null
          id: string
          option_text: string
          proposal_id: string
          shares_voted: number | null
          votes_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          proposal_id: string
          shares_voted?: number | null
          votes_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          proposal_id?: string
          shares_voted?: number | null
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voting_options_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "voting_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_proposals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          id: string
          minimum_shares_required: number | null
          proposal_document_url: string | null
          proposal_type: string | null
          quorum_percentage: number | null
          rejection_reason: string | null
          start_date: string | null
          status: string | null
          title: string
          total_shares_voted: number | null
          total_votes: number | null
          updated_at: string | null
          voting_method: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          minimum_shares_required?: number | null
          proposal_document_url?: string | null
          proposal_type?: string | null
          quorum_percentage?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          total_shares_voted?: number | null
          total_votes?: number | null
          updated_at?: string | null
          voting_method?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          minimum_shares_required?: number | null
          proposal_document_url?: string | null
          proposal_type?: string | null
          quorum_percentage?: number | null
          rejection_reason?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          total_shares_voted?: number | null
          total_votes?: number | null
          updated_at?: string | null
          voting_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voting_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "voting_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_settings: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_deposits: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string | null
          currency: string | null
          id: string
          method: string | null
          provider_reference: string | null
          status: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          provider_reference?: string | null
          status?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          provider_reference?: string | null
          status?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_deposits_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_fees: {
        Row: {
          created_at: string | null
          currency: string
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          is_active: boolean | null
          maximum_fee: number | null
          minimum_fee: number | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          maximum_fee?: number | null
          minimum_fee?: number | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_global_settings: {
        Row: {
          description: string | null
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      wallet_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string
          id: string
          otp_verified: boolean | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          status: string | null
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency: string
          id?: string
          otp_verified?: boolean | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          otp_verified?: boolean | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallet_withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          destination_account: string | null
          id: string
          method: string | null
          processed_at: string | null
          status: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          destination_account?: string | null
          id?: string
          method?: string | null
          processed_at?: string | null
          status?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          destination_account?: string | null
          id?: string
          method?: string | null
          processed_at?: string | null
          status?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          import_batch_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency: string
          id?: string
          import_batch_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          import_batch_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_dashboard_metrics: {
        Row: {
          active_users: number | null
          blocked_users: number | null
          imported_users: number | null
          new_registrations_week: number | null
          pending_verifications: number | null
          total_users: number | null
        }
        Relationships: []
      }
      admin_transactions_unified: {
        Row: {
          admin_notes: string | null
          amount: number | null
          approval_status: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          processing_batch_id: string | null
          source_type: string | null
          source_wallet_name: string | null
          status: string | null
          target_type: string | null
          target_wallet_name: string | null
          transaction_category: string | null
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          metadata?: Json | null
          processing_batch_id?: string | null
          source_type?: string | null
          source_wallet_name?: never
          status?: string | null
          target_type?: string | null
          target_wallet_name?: never
          transaction_category?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          metadata?: Json | null
          processing_batch_id?: string | null
          source_type?: string | null
          source_wallet_name?: never
          status?: string | null
          target_type?: string | null
          target_wallet_name?: never
          transaction_category?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_wallet_summary: {
        Row: {
          currency: string | null
          last_update: string | null
          total_balance: number | null
          wallet_count: number | null
          wallet_type: string | null
        }
        Relationships: []
      }
      agent_transactions_unified: {
        Row: {
          agent_code: string | null
          agent_id: string | null
          agent_user_id: string | null
          amount: number | null
          client_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          fee_amount: number | null
          id: string | null
          metadata: Json | null
          status: string | null
          transaction_category: string | null
          transaction_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["agent_user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_user_summary: {
        Row: {
          email: string | null
          full_name: string | null
          paid_commissions: number | null
          pending_earnings: number | null
          referral_code: string | null
          successful_referrals: number | null
          total_commissions: number | null
          total_earnings: number | null
          total_referrals: number | null
          user_id: string | null
          user_joined_at: string | null
        }
        Relationships: []
      }
      referrer_rankings: {
        Row: {
          rank: number | null
          referrer_id: string | null
          total_commissions: number | null
          total_earnings: number | null
          unique_referrals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_commissions_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      security_dashboard: {
        Row: {
          metric: string | null
          period: string | null
          value: string | null
        }
        Relationships: []
      }
      share_transactions_unified: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          price_per_share: number | null
          quantity: number | null
          share_id: string | null
          share_name: string | null
          status: string | null
          total_shares_after: number | null
          transaction_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_summary: {
        Row: {
          amount: number | null
          approval_status: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          status: string | null
          transaction_type: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      user_financial_summary: {
        Row: {
          currency: string | null
          last_wallet_update: string | null
          total_balance: number | null
          user_id: string | null
          wallet_count: number | null
        }
        Relationships: []
      }
      user_profile_essentials: {
        Row: {
          account_type: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_imported: boolean | null
          last_login: string | null
          login_count: number | null
          phone: string | null
          profile_completion_percentage: number | null
          profile_picture_url: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          user_role: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_imported?: never
          last_login?: string | null
          login_count?: number | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          user_role?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_imported?: never
          last_login?: string | null
          login_count?: number | null
          phone?: string | null
          profile_completion_percentage?: number | null
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_share_balances_calculated: {
        Row: {
          calculated_balance: number | null
          share_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_share_holdings_summary: {
        Row: {
          last_portfolio_update: string | null
          total_portfolio_value: number | null
          total_shares_quantity: number | null
          unique_shares_held: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_transaction_history_unified: {
        Row: {
          admin_notes: string | null
          agent_code: string | null
          amount: number | null
          approval_status: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          fee_amount: number | null
          id: string | null
          metadata: Json | null
          reference: string | null
          share_name: string | null
          source_type: string | null
          status: string | null
          target_type: string | null
          transaction_category: string | null
          transaction_direction: string | null
          transaction_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          agent_code?: never
          amount?: number | null
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string | null
          metadata?: Json | null
          reference?: string | null
          share_name?: never
          source_type?: string | null
          status?: string | null
          target_type?: string | null
          transaction_category?: string | null
          transaction_direction?: never
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          agent_code?: never
          amount?: number | null
          approval_status?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string | null
          metadata?: Json | null
          reference?: string | null
          share_name?: never
          source_type?: string | null
          status?: string | null
          target_type?: string | null
          transaction_category?: string | null
          transaction_direction?: never
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_user_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile_essentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "verification_priority_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_priority_queue: {
        Row: {
          email: string | null
          full_name: string | null
          hours_waiting: number | null
          id: string | null
          phone: string | null
          priority_level: string | null
          profile_completion_percentage: number | null
          status: Database["public"]["Enums"]["user_status"] | null
          verification_submitted_at: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          hours_waiting?: never
          id?: string | null
          phone?: string | null
          priority_level?: never
          profile_completion_percentage?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          verification_submitted_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          hours_waiting?: never
          id?: string | null
          phone?: string | null
          priority_level?: never
          profile_completion_percentage?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_and_process_transfer: {
        Args: { p_admin_id?: string; p_transfer_id: string }
        Returns: Json
      }
      allocate_share_purchase_proceeds: {
        Args: {
          p_amount: number
          p_currency: string
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      allocate_share_purchase_proceeds_enhanced: {
        Args: {
          p_amount: number
          p_currency?: string
          p_transaction_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      allocate_transaction_fee: {
        Args: { fee_amount: number; fee_currency?: string }
        Returns: undefined
      }
      allocate_transaction_fee_enhanced: {
        Args: {
          p_base_amount: number
          p_currency?: string
          p_fee_amount: number
          p_transaction_id: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      allocate_transaction_fee_with_snapshot: {
        Args: {
          p_base_amount: number
          p_currency?: string
          p_transaction_id: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      auto_assign_chat_to_agent: {
        Args: { p_conversation_id: string }
        Returns: string
      }
      auto_close_expired_proposals: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      backfill_exchange_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      backfill_financial_activities_as_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      batch_process_missed_transactions: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      build_activation_url: {
        Args: { p_base_url?: string; p_token: string }
        Returns: string
      }
      bulk_invite_imported_users: {
        Args: { p_batch_size?: number; p_user_ids?: string[] }
        Returns: Json
      }
      bulk_update_share_status: {
        Args: {
          p_grace_period_ends_at?: string
          p_new_status: Database["public"]["Enums"]["share_status"]
          p_reason?: string
          p_user_share_ids: string[]
        }
        Returns: string
      }
      calculate_agent_tier: {
        Args: { p_agent_id: string }
        Returns: string
      }
      calculate_available_shares: {
        Args: { p_share_id: string }
        Returns: number
      }
      calculate_bucket_stock: {
        Args: {
          p_as_of_date?: string
          p_bucket_name: string
          p_share_id: string
        }
        Returns: number
      }
      calculate_comprehensive_wallet_balance: {
        Args: { p_wallet_id: string }
        Returns: number
      }
      calculate_debt_conversion_fee: {
        Args: { p_debt_amount: number }
        Returns: number
      }
      calculate_enhanced_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_enhanced_share_price: {
        Args: {
          p_calculation_method?: string
          p_dividend_data?: Json
          p_manual_adjustment?: number
          p_market_data?: Json
          p_mining_profit_data?: Json
          p_share_id: string
        }
        Returns: string
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_progressive_ownership: {
        Args: { p_booking_id: string; p_payment_amount: number }
        Returns: Json
      }
      calculate_referral_tier: {
        Args: { referral_count: number }
        Returns: string
      }
      calculate_simple_wallet_balance: {
        Args: { p_wallet_id: string }
        Returns: number
      }
      calculate_transaction_fee: {
        Args: {
          p_amount: number
          p_currency?: string
          p_transaction_type: string
        }
        Returns: number
      }
      calculate_user_share_balance: {
        Args: { p_share_id: string; p_user_id: string }
        Returns: number
      }
      can_trade_shares: {
        Args: { p_user_share_id: string }
        Returns: boolean
      }
      cancel_booking_order: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      cancel_sell_order: {
        Args: { p_order_id: string; p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      cast_vote: {
        Args:
          | {
              p_ip_address?: unknown
              p_option_id: string
              p_proposal_id: string
              p_user_agent?: string
              p_user_id: string
            }
          | {
              p_option_id: string
              p_proposal_id: string
              p_user_id: string
              p_vote_weight?: number
            }
        Returns: Json
      }
      check_admin_role: {
        Args: { user_id?: string }
        Returns: boolean
      }
      check_auto_approval: {
        Args: { p_transfer_id: string }
        Returns: boolean
      }
      check_debt_conversion_eligibility: {
        Args: { p_club_member_id: string }
        Returns: Json
      }
      check_kyc_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      check_proposal_quorum: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      check_sms_rate_limit: {
        Args: { p_phone_number: string; p_user_id: string }
        Returns: boolean
      }
      check_user_auth_status: {
        Args: { p_email: string }
        Returns: Json
      }
      check_user_status_public: {
        Args: { p_email?: string; p_phone?: string }
        Returns: Json
      }
      check_voting_eligibility: {
        Args: { p_proposal_id: string; p_user_id: string }
        Returns: Json
      }
      cleanup_demo_user_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_orphaned_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_orphaned_auth_users_db: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      complete_chat_assignment: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      create_auth_account_for_imported_user: {
        Args: {
          p_activation_token: string
          p_email: string
          p_password: string
          p_profile_id: string
        }
        Returns: Json
      }
      create_auth_for_imported_user: {
        Args: {
          p_email: string
          p_invitation_token: string
          p_password: string
          p_user_id: string
        }
        Returns: Json
      }
      create_exchange_transaction: {
        Args: {
          p_description?: string
          p_exchange_rate: number
          p_fee_amount?: number
          p_from_amount: number
          p_from_currency: string
          p_from_wallet_id: string
          p_to_amount: number
          p_to_currency: string
          p_to_wallet_id: string
          p_user_id: string
        }
        Returns: Json
      }
      create_missing_wallets: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_or_update_allocation_rules: {
        Args: {
          p_buyback_percent: number
          p_currency?: string
          p_expenses_percent: number
          p_project_funding_percent: number
        }
        Returns: string
      }
      create_or_update_allocation_rules_v2: {
        Args: {
          p_buyback_percent: number
          p_currency?: string
          p_expenses_percent: number
          p_project_funding_percent: number
        }
        Returns: string
      }
      create_recipient_wallet: {
        Args: { p_currency: string; p_user_id: string }
        Returns: string
      }
      create_validated_transaction: {
        Args: {
          p_amount: number
          p_approval_status?: string
          p_currency: string
          p_description?: string
          p_fee_amount?: number
          p_metadata?: Json
          p_reference?: string
          p_status?: string
          p_transaction_type: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: string
      }
      deduct_from_admin_fund: {
        Args: {
          deduction_amount: number
          deduction_currency?: string
          deduction_description?: string
          deduction_type?: string
        }
        Returns: boolean
      }
      diagnose_wallet_balance_discrepancy: {
        Args: { p_user_id: string }
        Returns: {
          currency: string
          discrepancy: number
          needs_correction: boolean
          transactions_calculated_balance: number
          wallet_id: string
          wallet_table_balance: number
        }[]
      }
      end_admin_session: {
        Args: { admin_user_id: string }
        Returns: undefined
      }
      find_duplicate_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          user_count: number
          user_ids: string[]
        }[]
      }
      find_duplicate_phones: {
        Args: Record<PropertyKey, never>
        Returns: {
          phone: string
          user_count: number
          user_ids: string[]
        }[]
      }
      find_orphaned_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          needs_auth_creation: boolean
          profile_id: string
        }[]
      }
      find_profiles_without_wallets: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          full_name: string
          missing_currencies: string[]
          profile_id: string
        }[]
      }
      fix_all_wallet_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_missing_referrals: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          user_id: string
          user_name: string
        }[]
      }
      generate_consent_invitation: {
        Args: {
          p_club_allocation_id: string
          p_club_member_id: string
          p_email: string
          p_phone?: string
        }
        Returns: string
      }
      generate_correlation_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_token: {
        Args: { p_created_by?: string; p_user_id: string }
        Returns: string
      }
      generate_next_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
        Args: { p_full_name: string; p_user_id: string }
        Returns: string
      }
      generate_referral_code_yawatu_format: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_unique_agent_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_agent_tier_benefits: {
        Args: { p_tier: string }
        Returns: {
          commission_rate: number
          fee_share_percentage: number
          tier_name: string
        }[]
      }
      get_auto_pricing_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_market_state: {
        Args: Record<PropertyKey, never>
        Returns: {
          auto_buyback_enabled: boolean
          config_name: string
          p2p_enabled: boolean
          schedule_rules: Json
          state_type: string
        }[]
      }
      get_current_share_price: {
        Args: { p_share_id: string; p_transaction_type?: string }
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_demo_user_status: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_email_analytics_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_cost_per_email: number
          bounce_rate: number
          daily_breakdown: Json
          delivery_rate: number
          top_provider: string
          total_bounced: number
          total_cost: number
          total_delivered: number
          total_failed: number
          total_sent: number
        }[]
      }
      get_email_providers_by_priority: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_endpoint: string
          configuration: Json
          cost_per_email: number
          daily_limit: number
          id: string
          monthly_limit: number
          name: string
          provider_type: string
        }[]
      }
      get_referral_commission_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          admin_fund_impact: number
          avg_commission_rate: number
          top_referrers: Json
          total_commissions_paid: number
          total_transactions: number
        }[]
      }
      get_referral_user_summary: {
        Args: { p_user_id?: string }
        Returns: {
          email: string
          full_name: string
          paid_commissions: number
          pending_earnings: number
          referral_code: string
          successful_referrals: number
          total_commissions: number
          total_earnings: number
          total_referrals: number
          user_id: string
          user_joined_at: string
        }[]
      }
      get_rls_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          security_status: string
          table_name: string
        }[]
      }
      get_security_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          metric_name: string
          metric_value: string
          severity: string
        }[]
      }
      get_share_distribution_with_movements: {
        Args: { p_share_id: string }
        Returns: {
          bucket_name: string
          current_stock: number
          last_movement: string
          movement_count: number
        }[]
      }
      get_sms_analytics_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_cost_per_sms: number
          daily_breakdown: Json
          success_rate: number
          top_provider: string
          total_cost: number
          total_delivered: number
          total_failed: number
          total_sent: number
        }[]
      }
      get_sms_providers_by_priority: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_endpoint: string
          configuration: Json
          cost_per_sms: number
          id: string
          provider_name: string
          provider_type: string
          retry_attempts: number
          timeout_seconds: number
        }[]
      }
      get_sync_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_tier_commission_rate: {
        Args: { tier: string }
        Returns: number
      }
      get_transaction_fee_settings: {
        Args: { p_transaction_type: string }
        Returns: {
          fee_percentage: number
          fee_type: string
          flat_fee: number
          maximum_fee: number
          minimum_fee: number
        }[]
      }
      get_user_id_from_booking: {
        Args: { p_booking_id: string }
        Returns: string
      }
      get_user_voting_power: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_wallet_id: {
        Args: { p_currency: string; p_user_id: string }
        Returns: string
      }
      get_wallet_balance_breakdown: {
        Args: { p_wallet_id: string }
        Returns: {
          net_impact: number
          total_amount: number
          total_fees: number
          transaction_count: number
          transaction_type: string
        }[]
      }
      get_wallet_for_user: {
        Args: { p_currency: string; p_user_id: string }
        Returns: {
          current_balance: number
          wallet_id: string
          wallet_status: string
        }[]
      }
      hash_pin: {
        Args: { pin: string }
        Returns: {
          hash: string
          salt: string
        }[]
      }
      identify_missed_transactions: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          created_at: string
          currency: string
          has_fee_collection: boolean
          has_fund_allocation: boolean
          transaction_id: string
          transaction_type: string
          user_id: string
        }[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_pool_purchase: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      link_referral_on_registration: {
        Args: { p_referrer_code: string; p_user_id: string }
        Returns: boolean
      }
      log_auth_event: {
        Args: { p_event_type: string; p_metadata?: Json; p_user_id?: string }
        Returns: undefined
      }
      log_cron_execution: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      manage_auto_pricing_cron: {
        Args: { p_enabled?: boolean; p_interval_hours: number }
        Returns: Json
      }
      modify_sell_order_quantity: {
        Args: {
          p_new_quantity: number
          p_order_id: string
          p_reason?: string
          p_user_id: string
        }
        Returns: boolean
      }
      process_agent_commission_payout: {
        Args: { p_agent_id: string; p_commission_ids?: string[] }
        Returns: Json
      }
      process_agent_transaction_fee_share: {
        Args: {
          p_agent_id: string
          p_client_id: string
          p_currency?: string
          p_fee_amount: number
          p_transaction_id: string
        }
        Returns: Json
      }
      process_booking_payment: {
        Args: {
          p_booking_id: string
          p_payment_amount: number
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_buyback_order: {
        Args: { p_order_id: string }
        Returns: Json
      }
      process_consent_acceptance: {
        Args: {
          p_consent_text: string
          p_digital_signature: string
          p_invitation_token: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      process_deposit_with_fee_separation: {
        Args: {
          p_currency: string
          p_description?: string
          p_fee_amount: number
          p_gross_amount: number
          p_reference?: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: Json
      }
      process_email_delivery_webhook: {
        Args: { p_provider_name: string; p_webhook_data: Json }
        Returns: undefined
      }
      process_referral_activity: {
        Args: {
          p_activity_type: string
          p_investment_amount?: number
          p_referred_id: string
          p_referrer_id: string
          p_transaction_id?: string
        }
        Returns: Json
      }
      process_referral_signup: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: boolean
      }
      process_sell_order_completion: {
        Args: { p_admin_id?: string; p_order_id: string }
        Returns: Json
      }
      process_sell_orders_batch: {
        Args: {
          p_admin_id: string
          p_order_ids: string[]
          p_processing_type?: string
        }
        Returns: string
      }
      process_share_transfer: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      process_signup_referral: {
        Args: { p_referral_code: string; p_user_id: string }
        Returns: Json
      }
      process_sms_delivery_webhook: {
        Args: { p_provider_name: string; p_webhook_data: Json }
        Returns: undefined
      }
      process_transaction_approval: {
        Args: {
          p_action: string
          p_admin_notes?: string
          p_transaction_id: string
        }
        Returns: boolean
      }
      process_validated_transaction: {
        Args: {
          p_amount: number
          p_currency: string
          p_metadata?: Json
          p_reference?: string
          p_transaction_type: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: Json
      }
      process_wallet_transfer: {
        Args: {
          p_amount: number
          p_currency: string
          p_fee_amount: number
          p_recipient_identifier: string
          p_recipient_name: string
          p_recipient_user_id: string
          p_recipient_wallet_id: string
          p_reference: string
          p_sender_user_id: string
          p_sender_wallet_id: string
        }
        Returns: Json
      }
      process_withdrawal_with_fee_split: {
        Args: {
          p_currency: string
          p_description?: string
          p_fee_amount: number
          p_recipient_name?: string
          p_recipient_phone?: string
          p_reference?: string
          p_user_id: string
          p_wallet_id: string
          p_withdrawal_amount: number
          p_withdrawal_method?: string
        }
        Returns: Json
      }
      reconcile_exchange_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_share_pools: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_user_share_holdings: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      reconcile_user_statuses: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_wallet_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      record_share_movement: {
        Args: {
          p_admin_id?: string
          p_currency: string
          p_description?: string
          p_destination_bucket: string
          p_movement_type: string
          p_price_per_share: number
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_share_id: string
          p_source_bucket: string
          p_status?: string
          p_total_value: number
          p_user_id?: string
        }
        Returns: string
      }
      record_share_purchase_transaction: {
        Args: {
          p_currency: string
          p_order_id: string
          p_price_per_share: number
          p_quantity: number
          p_share_id: string
          p_total_amount: number
          p_user_id: string
          p_wallet_id: string
        }
        Returns: string
      }
      record_transaction_entry: {
        Args: {
          p_agent_id?: string
          p_amount: number
          p_currency?: string
          p_description: string
          p_fee_amount?: number
          p_metadata?: Json
          p_reference?: string
          p_share_id?: string
          p_source_type?: string
          p_source_wallet_id?: string
          p_target_type?: string
          p_target_wallet_id?: string
          p_transaction_category?: string
          p_transaction_type: string
          p_user_id?: string
        }
        Returns: string
      }
      recover_referral_commissions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reduce_booking_quantity: {
        Args: {
          p_booking_id: string
          p_new_quantity: number
          p_user_id: string
        }
        Returns: Json
      }
      refresh_referral_user_summary: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_user_share_balances: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_daily_email_budget: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_daily_sms_budget: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_monthly_email_budget: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_monthly_sms_budget: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_wallet_to_transaction_balance: {
        Args: { p_wallet_id: string }
        Returns: Json
      }
      retroactive_process_missed_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      security_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_search_path: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_demo_user_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      submit_sell_order: {
        Args:
          | {
              p_order_type?: string
              p_quantity: number
              p_requested_price?: number
              p_share_id: string
              p_user_id: string
            }
          | {
              p_order_type?: string
              p_quantity: number
              p_share_id: string
              p_user_id: string
            }
        Returns: string
      }
      sync_all_comprehensive_wallet_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      sync_all_wallet_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      sync_wallet_balance: {
        Args: { p_wallet_id: string }
        Returns: number
      }
      system_process_pending_transfers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      track_share_movement: {
        Args: {
          p_admin_id?: string
          p_description?: string
          p_destination_bucket: string
          p_metadata?: Json
          p_movement_type: string
          p_price_per_share?: number
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_share_id: string
          p_source_bucket: string
          p_user_id?: string
        }
        Returns: string
      }
      track_user_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      transfer_admin_funds: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_description: string
          p_from_wallet_id: string
          p_reference?: string
          p_to_wallet_id: string
        }
        Returns: undefined
      }
      update_agent_performance_metrics: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      update_all_referral_codes_to_yawatu_format: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_email_budget_spending: {
        Args: { p_cost: number }
        Returns: undefined
      }
      update_market_state: {
        Args: {
          p_automated?: boolean
          p_change_reason?: string
          p_new_state: string
        }
        Returns: string
      }
      update_recipient_wallet_balance: {
        Args: { p_amount: number; p_currency: string; p_user_id: string }
        Returns: undefined
      }
      update_share_availability: {
        Args: { p_share_id: string }
        Returns: undefined
      }
      update_share_status: {
        Args: {
          p_batch_operation_id?: string
          p_grace_period_ends_at?: string
          p_new_status: Database["public"]["Enums"]["share_status"]
          p_reason?: string
          p_user_share_id: string
        }
        Returns: boolean
      }
      update_sms_budget_spending: {
        Args: { p_cost: number }
        Returns: undefined
      }
      update_sms_delivery_status: {
        Args: { p_otp_id: string; p_provider_response?: Json; p_status: string }
        Returns: undefined
      }
      user_has_voting_power: {
        Args: { p_minimum_shares: number; p_user_id: string }
        Returns: boolean
      }
      validate_consent_invitation: {
        Args: { p_token: string }
        Returns: {
          club_allocation_id: string
          club_member_id: string
          email: string
          invitation_id: string
          is_valid: boolean
          phone: string
        }[]
      }
      validate_demo_user_setup: {
        Args: { p_user_id: string }
        Returns: Json
      }
      validate_invitation_token: {
        Args: { p_token: string }
        Returns: string
      }
      validate_invitation_token_enhanced: {
        Args: { p_token: string }
        Returns: Json
      }
      validate_share_purchase: {
        Args: { p_quantity: number; p_share_id: string }
        Returns: Json
      }
      validate_transaction_request: {
        Args: {
          p_amount: number
          p_transaction_type: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: Json
      }
      validate_ugandan_phone: {
        Args: { phone_text: string }
        Returns: Json
      }
      verify_pin: {
        Args: { pin: string; user_id: string }
        Returns: boolean
      }
      verify_recipient_lookup: {
        Args: { p_email?: string; p_phone?: string }
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
          status: string
          user_exists: boolean
          verified: boolean
        }[]
      }
      verify_recipient_lookup_with_wallet: {
        Args:
          | { p_currency?: string; p_email?: string; p_phone?: string }
          | { p_email?: string; p_phone?: string }
        Returns: {
          email: string
          full_name: string
          has_wallet: boolean
          id: string
          phone: string
          status: string
          user_exists: boolean
          verified: boolean
          wallet_id: string
        }[]
      }
    }
    Enums: {
      document_status: "pending" | "approved" | "rejected"
      document_type:
        | "national_id"
        | "birth_certificate"
        | "proof_of_address"
        | "business_registration"
        | "trading_license"
        | "operational_permit"
        | "registration_certificate"
        | "passport"
        | "guardian_id"
      proposal_status_enhanced:
        | "draft"
        | "review"
        | "active"
        | "closed"
        | "cancelled"
      relationship_type:
        | "parent"
        | "guardian"
        | "sibling"
        | "friend"
        | "director"
        | "other"
        | "spouse"
        | "child"
        | "partner"
        | "colleague"
      share_status: "pending" | "locked" | "released" | "available_for_trade"
      share_transaction_type:
        | "purchase"
        | "sale"
        | "transfer"
        | "buyback"
        | "dividend"
      user_status: "active" | "blocked" | "unverified" | "pending_verification"
      user_type: "individual" | "organisation" | "minor" | "admin" | "business"
      vote_choice: "yes" | "no" | "abstain"
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
      document_status: ["pending", "approved", "rejected"],
      document_type: [
        "national_id",
        "birth_certificate",
        "proof_of_address",
        "business_registration",
        "trading_license",
        "operational_permit",
        "registration_certificate",
        "passport",
        "guardian_id",
      ],
      proposal_status_enhanced: [
        "draft",
        "review",
        "active",
        "closed",
        "cancelled",
      ],
      relationship_type: [
        "parent",
        "guardian",
        "sibling",
        "friend",
        "director",
        "other",
        "spouse",
        "child",
        "partner",
        "colleague",
      ],
      share_status: ["pending", "locked", "released", "available_for_trade"],
      share_transaction_type: [
        "purchase",
        "sale",
        "transfer",
        "buyback",
        "dividend",
      ],
      user_status: ["active", "blocked", "unverified", "pending_verification"],
      user_type: ["individual", "organisation", "minor", "admin", "business"],
      vote_choice: ["yes", "no", "abstain"],
    },
  },
} as const
