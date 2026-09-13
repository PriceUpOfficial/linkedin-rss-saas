import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/dashboard/posts");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow">
        <div>
          <h1 className="text-xl font-semibold">Accedi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ti invieremo un link di accesso via email, senza password.
          </p>
        </div>
        <LoginForm redirectTo={next ?? "/dashboard/posts"} />
      </div>
    </div>
  );
}
