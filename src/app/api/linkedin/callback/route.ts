import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, fetchLinkedInUserInfo } from "@/lib/linkedin";

// Step 2 of the custom LinkedIn OAuth 2.0 flow: validate `state`, exchange
// the authorization `code` for tokens, fetch the member's `sub`, and store
// everything in linkedin_accounts for this user.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const linkedInError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const redirectWithError = (message: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/linkedin?error=${encodeURIComponent(message)}`, request.url)
    );

  if (linkedInError) {
    return redirectWithError(linkedInError);
  }
  if (!code || !state) {
    return redirectWithError("Parametri OAuth mancanti nel callback di LinkedIn.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // The state must exist, be unexpired, and belong to this same user.
  const { data: stateRow, error: stateError } = await supabase
    .from("oauth_states")
    .select("id, user_id, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (stateError || !stateRow) {
    return redirectWithError("Stato OAuth non valido o già utilizzato.");
  }

  // Consume it immediately so it can't be replayed.
  await supabase.from("oauth_states").delete().eq("id", stateRow.id);

  if (stateRow.user_id !== user.id) {
    return redirectWithError("Lo stato OAuth non corrisponde all'utente corrente.");
  }
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return redirectWithError("Lo stato OAuth è scaduto, riprova la connessione.");
  }

  try {
    const token = await exchangeCodeForToken(code);
    const userInfo = await fetchLinkedInUserInfo(token.access_token);

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase.from("linkedin_accounts").upsert(
      {
        user_id: user.id,
        linkedin_sub: userInfo.sub,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        scope: token.scope ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return redirectWithError(upsertError.message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto durante il collegamento a LinkedIn.";
    return redirectWithError(message);
  }

  return NextResponse.redirect(new URL("/dashboard/linkedin?connected=1", request.url));
}
