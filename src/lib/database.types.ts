// Hand-written types mirroring supabase/migrations/20260913000000_init_schema.sql.
// Regenerate/replace with `supabase gen types typescript` once the project
// is linked to a live Supabase instance, if you want full drift protection.
//
// Every table includes `Relationships: []` and `public` includes empty
// `Views`/`Functions` maps solely to satisfy postgrest-js's `GenericSchema`
// constraint — this project defines no foreign-table embeds, views or
// Postgres functions.

export type PostStatus = "pending" | "approved" | "rejected" | "posted" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          is_admin: boolean;
          subscription_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      rss_feeds: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          title: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rss_feeds"]["Row"]> & {
          user_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["rss_feeds"]["Row"]>;
        Relationships: [];
      };
      feed_items: {
        Row: {
          id: string;
          feed_id: string;
          user_id: string;
          guid: string;
          title: string | null;
          link: string | null;
          summary: string | null;
          published_at: string | null;
          fetched_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_items"]["Row"]> & {
          feed_id: string;
          user_id: string;
          guid: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_items"]["Row"]>;
        Relationships: [];
      };
      linkedin_accounts: {
        Row: {
          id: string;
          user_id: string;
          linkedin_sub: string | null;
          access_token: string;
          refresh_token: string | null;
          scope: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["linkedin_accounts"]["Row"]> & {
          user_id: string;
          access_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["linkedin_accounts"]["Row"]>;
        Relationships: [];
      };
      oauth_states: {
        Row: {
          id: string;
          user_id: string;
          state: string;
          created_at: string;
          expires_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["oauth_states"]["Row"]> & {
          user_id: string;
          state: string;
        };
        Update: Partial<Database["public"]["Tables"]["oauth_states"]["Row"]>;
        Relationships: [];
      };
      generated_posts: {
        Row: {
          id: string;
          user_id: string;
          feed_item_id: string | null;
          content: string;
          status: PostStatus;
          linkedin_post_urn: string | null;
          error_message: string | null;
          approved_at: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generated_posts"]["Row"]> & {
          user_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["generated_posts"]["Row"]>;
        Relationships: [];
      };
      content: {
        Row: {
          id: string;
          title: string;
          slug: string;
          body: string | null;
          video_url: string | null;
          is_published: boolean;
          is_premium: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["content"]["Row"]> & {
          title: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["content"]["Row"]>;
        Relationships: [];
      };
      generation_settings: {
        Row: {
          user_id: string;
          tone: string;
          language: string;
          posts_per_day: number;
          custom_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generation_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["generation_settings"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
