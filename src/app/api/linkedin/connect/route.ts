import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildLinkedInAuthorizationUrl } from "@/lib/linkedin";

// Step 1 of the custom LinkedIn OAuth 2.0 flow: create a CSRF `state`,
// stash it (tied to the logged-in user) in oauth_states, and redirect the
// browser to LinkedIn's authorization screen.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomUUID();

  const { error } = await supabase.from("oauth_states").insert({
    user_id: user.id,
    state,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/linkedin?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(buildLinkedInAuthorizationUrl(state));
}
