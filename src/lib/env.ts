// Small helpers to fail fast (with a clear message) when a required
// environment variable is missing, instead of failing later with a
// confusing runtime error deep inside a fetch call.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
  get linkedinClientId() {
    return required("LINKEDIN_CLIENT_ID", process.env.LINKEDIN_CLIENT_ID);
  },
  get linkedinClientSecret() {
    return required("LINKEDIN_CLIENT_SECRET", process.env.LINKEDIN_CLIENT_SECRET);
  },
  get linkedinRedirectUri() {
    return required("LINKEDIN_REDIRECT_URI", process.env.LINKEDIN_REDIRECT_URI);
  },
  get n8nGenerateWebhookUrl() {
    return required("N8N_GENERATE_WEBHOOK_URL", process.env.N8N_GENERATE_WEBHOOK_URL);
  },
};
