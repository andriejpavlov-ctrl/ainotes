import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotesApp from "@/components/NotesApp";

export default async function NotesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <NotesApp userId={user.id} email={user.email ?? ""} />;
}
