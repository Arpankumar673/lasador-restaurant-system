/**
 * Database types for L'Asador – Grill & Brew, Mohali.
 *
 * ARCHITECTURAL MANDATES:
 * - Single-restaurant architecture (Sector 82, Mohali, Punjab).
 * - Absolutely NO multi-tenant identifiers, organization_id, or multi-tenant abstractions.
 * - Normalized PostgreSQL schema managed via Supabase.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = "owner" | "admin" | "manager" | "kitchen" | "bar";

export type ItemStation =
  | "kitchen_grill"
  | "kitchen_fry"
  | "kitchen_pantry"
  | "bar_taps"
  | "bar_cocktails";

export type DietaryType = "veg" | "non_veg" | "egg" | "vegan";

export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type ItemPrepStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type BillStatus = "open" | "requested" | "partially_paid" | "settled" | "voided";

export type PaymentMethod = "cash" | "upi_qr" | "card" | "pos_machine";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Database {
  public: {
    Tables: {
      restaurant_settings: {
        Row: {
          id: number;
          name: string;
          tagline: string | null;
          description: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          country: string;
          phone: string;
          email: string;
          gst_number: string | null;
          fssai_license: string | null;
          currency: string;
          currency_symbol: string;
          timezone: string;
          is_ordering_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          phone?: string;
          email?: string;
          gst_number?: string | null;
          fssai_license?: string | null;
          currency?: string;
          currency_symbol?: string;
          timezone?: string;
          is_ordering_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          phone?: string;
          email?: string;
          gst_number?: string | null;
          fssai_license?: string | null;
          currency?: string;
          currency_symbol?: string;
          timezone?: string;
          is_ordering_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_hours: {
        Row: {
          id: string;
          day_of_week: number;
          day_name: string;
          open_time: string;
          close_time: string;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          day_name: string;
          open_time?: string;
          close_time?: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          day_name?: string;
          open_time?: string;
          close_time?: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tax_settings: {
        Row: {
          id: string;
          name: string;
          code: string;
          rate_percentage: number;
          is_active: boolean;
          is_mandatory: boolean;
          is_inclusive: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          rate_percentage: number;
          is_active?: boolean;
          is_mandatory?: boolean;
          is_inclusive?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          rate_percentage?: number;
          is_active?: boolean;
          is_mandatory?: boolean;
          is_inclusive?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_roles: {
        Row: {
          role: StaffRole;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          role: StaffRole;
          name: string;
          description: string;
          created_at?: string;
        };
        Update: {
          role?: StaffRole;
          name?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      staff_permissions: {
        Row: {
          id: string;
          role: StaffRole;
          permission_key: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          role: StaffRole;
          permission_key: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: StaffRole;
          permission_key?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: StaffRole;
          phone: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: StaffRole;
          phone?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: StaffRole;
          phone?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          station: ItemStation;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          station?: ItemStation;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          station?: ItemStation;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          base_price: number;
          dietary: DietaryType;
          station: ItemStation;
          is_available: boolean;
          is_featured: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          base_price: number;
          dietary?: DietaryType;
          station?: ItemStation;
          is_available?: boolean;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          base_price?: number;
          dietary?: DietaryType;
          station?: ItemStation;
          is_available?: boolean;
          is_featured?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          alt_text: string | null;
          is_primary: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          alt_text?: string | null;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          alt_text?: string | null;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price: number;
          is_available: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          price: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          sku?: string | null;
          price?: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modifier_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          min_selections: number;
          max_selections: number;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          min_selections?: number;
          max_selections?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          min_selections?: number;
          max_selections?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modifiers: {
        Row: {
          id: string;
          modifier_group_id: string;
          name: string;
          price_delta: number;
          is_available: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          modifier_group_id: string;
          name: string;
          price_delta?: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          modifier_group_id?: string;
          name?: string;
          price_delta?: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_modifier_groups: {
        Row: {
          product_id: string;
          modifier_group_id: string;
          display_order: number;
        };
        Insert: {
          product_id: string;
          modifier_group_id: string;
          display_order?: number;
        };
        Update: {
          product_id?: string;
          modifier_group_id?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      dining_tables: {
        Row: {
          id: string;
          table_number: string;
          label: string | null;
          zone: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_number: string;
          label?: string | null;
          zone?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_number?: string;
          label?: string | null;
          zone?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_qr_tokens: {
        Row: {
          id: string;
          table_id: string;
          token_hash: string;
          is_active: boolean;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          table_id: string;
          token_hash: string;
          is_active?: boolean;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          table_id?: string;
          token_hash?: string;
          is_active?: boolean;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      table_sessions: {
        Row: {
          id: string;
          table_id: string;
          session_token_hash: string;
          guest_count: number;
          status: string;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          session_token_hash: string;
          guest_count?: number;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          session_token_hash?: string;
          guest_count?: number;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          table_id: string;
          session_id: string;
          status: OrderStatus;
          idempotency_key: string;
          subtotal: number;
          tax_total: number;
          service_charge: number;
          discount_total: number;
          total_amount: number;
          special_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          table_id: string;
          session_id: string;
          status?: OrderStatus;
          idempotency_key: string;
          subtotal?: number;
          tax_total?: number;
          service_charge?: number;
          discount_total?: number;
          total_amount?: number;
          special_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          table_id?: string;
          session_id?: string;
          status?: OrderStatus;
          idempotency_key?: string;
          subtotal?: number;
          tax_total?: number;
          service_charge?: number;
          discount_total?: number;
          total_amount?: number;
          special_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          product_name_snapshot: string;
          variant_name_snapshot: string | null;
          unit_price_snapshot: number;
          quantity: number;
          subtotal: number;
          station: ItemStation;
          prep_status: ItemPrepStatus;
          customer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          product_name_snapshot: string;
          variant_name_snapshot?: string | null;
          unit_price_snapshot: number;
          quantity?: number;
          subtotal: number;
          station?: ItemStation;
          prep_status?: ItemPrepStatus;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string | null;
          product_name_snapshot?: string;
          variant_name_snapshot?: string | null;
          unit_price_snapshot?: number;
          quantity?: number;
          subtotal?: number;
          station?: ItemStation;
          prep_status?: ItemPrepStatus;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_item_modifiers: {
        Row: {
          id: string;
          order_item_id: string;
          modifier_id: string;
          modifier_name_snapshot: string;
          price_delta_snapshot: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          modifier_id: string;
          modifier_name_snapshot: string;
          price_delta_snapshot?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          modifier_id?: string;
          modifier_name_snapshot?: string;
          price_delta_snapshot?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          bill_number: string;
          session_id: string;
          table_id: string;
          status: BillStatus;
          subtotal: number;
          cgst_amount: number;
          sgst_amount: number;
          service_charge: number;
          discount_amount: number;
          final_total: number;
          amount_paid: number;
          balance_remaining: number;
          requested_at: string | null;
          settled_at: string | null;
          settled_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bill_number: string;
          session_id: string;
          table_id: string;
          status?: BillStatus;
          subtotal?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          service_charge?: number;
          discount_amount?: number;
          final_total?: number;
          amount_paid?: number;
          balance_remaining?: number;
          requested_at?: string | null;
          settled_at?: string | null;
          settled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bill_number?: string;
          session_id?: string;
          table_id?: string;
          status?: BillStatus;
          subtotal?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          service_charge?: number;
          discount_amount?: number;
          final_total?: number;
          amount_paid?: number;
          balance_remaining?: number;
          requested_at?: string | null;
          settled_at?: string | null;
          settled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          bill_id: string;
          payment_method: PaymentMethod;
          status: PaymentStatus;
          amount: number;
          transaction_reference: string | null;
          collected_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bill_id: string;
          payment_method: PaymentMethod;
          status?: PaymentStatus;
          amount: number;
          transaction_reference?: string | null;
          collected_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bill_id?: string;
          payment_method?: PaymentMethod;
          status?: PaymentStatus;
          amount?: number;
          transaction_reference?: string | null;
          collected_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_role: {
        Args: Record<string, never>;
        Returns: StaffRole;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_owner_or_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_manager_or_above: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_profile_role: {
        Args: { user_id: string };
        Returns: StaffRole;
      };
      create_customer_order: {
        Args: { payload: Json };
        Returns: Json;
      };
      record_bill_payment_atomic: {
        Args: {
          p_bill_id: string;
          p_payment_method: PaymentMethod;
          p_amount: number;
          p_transaction_ref: string | null;
          p_collected_by: string;
          p_notes: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      staff_role: StaffRole;
      item_station: ItemStation;
      dietary_type: DietaryType;
      order_status: OrderStatus;
      item_prep_status: ItemPrepStatus;
      bill_status: BillStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
  };
}
