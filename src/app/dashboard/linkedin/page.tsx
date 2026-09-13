import { createClient } from "@/lib/supabase/server";
import { disconnectLinkedIn } from "./actions";

export default async function LinkedInPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: account } = await supabase
    .from("linkedin_accounts")
    .select("linkedin_sub, scope, expires_at, created_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  const isExpired = account?.expires_at ? new Date(account.expires_at).getTime() < Date.now() : false;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Account LinkedIn</h1>
        <p className="mt-1 text-sm text-gray-500">
          Collega il tuo account LinkedIn per poter pubblicare i post approvati. Il collegamento
          usa un flusso OAuth 2.0 dedicato con gli scope <code>openid profile w_member_social</code>.
        </p>
      </div>

      {searchParams.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
      )}
      {searchParams.connected && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Account LinkedIn collegato con successo.
        </p>
      )}

      <div className="rounded-md border border-gray-200 bg-white p-4">
        {account ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Stato:{" "}
              <span className={`font-medium ${isExpired ? "text-red-600" : "text-green-600"}`}>
                {isExpired ? "Token scaduto, ricollega l'account" : "Connesso"}
              </span>
            </p>
            <p className="text-xs text-gray-500">Scope: {account.scope ?? "n/d"}</p>
            <div className="flex gap-3">
              <a
                href="/api/linkedin/connect"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {isExpired ? "Ricollega account" : "Ricollega / aggiorna"}
              </a>
              <form action={disconnectLinkedIn}>
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Disconnetti
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Nessun account LinkedIn collegato.</p>
            <a
              href="/api/linkedin/connect"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Connetti LinkedIn
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
