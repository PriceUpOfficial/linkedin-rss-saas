import { createClient } from "@/lib/supabase/server";
import GenerateButton from "./generate-button";
import { approvePost, rejectPost } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  approved: "Approvato",
  rejected: "Scartato",
  posted: "Pubblicato",
  failed: "Fallito",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-gray-100 text-gray-600",
  posted: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default async function PostsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("generated_posts")
    .select("id, content, status, error_message, linkedin_post_urn, created_at, posted_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Post generati</h1>
          <p className="mt-1 text-sm text-gray-500">
            Approva un post per pubblicarlo subito su LinkedIn, oppure scartalo.
          </p>
        </div>
        <GenerateButton />
      </div>

      <ul className="space-y-3">
        {(posts ?? []).map((post) => (
          <li key={post.id} className="rounded-md border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[post.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABELS[post.status] ?? post.status}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString("it-IT")}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{post.content}</p>

            {post.status === "posted" && post.linkedin_post_urn && (
              <p className="mt-2 text-xs text-gray-500">URN LinkedIn: {post.linkedin_post_urn}</p>
            )}
            {post.status === "failed" && post.error_message && (
              <p className="mt-2 text-xs text-red-600">Errore: {post.error_message}</p>
            )}

            {post.status === "pending" && (
              <div className="mt-4 flex gap-3">
                <form action={approvePost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Approva e pubblica
                  </button>
                </form>
                <form action={rejectPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Scarta
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
        {(posts ?? []).length === 0 && (
          <li className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            Nessun post ancora generato. Clicca &laquo;Genera ora&raquo; per avviare il workflow.
          </li>
        )}
      </ul>
    </div>
  );
}
