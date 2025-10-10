import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { listAccessibleOrganizations } from "@/lib/orgs";

export async function GET() {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in" } },
      { status: 401 }
    );
  }

  const client = createServiceRoleSupabaseClient();
  const result = await listAccessibleOrganizations(client, userId);

  if (result.error) {
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: result.error.status ?? 500 }
    );
  }

  return NextResponse.json({ orgs: result.orgs ?? [], is_superuser: result.isSuperuser });
}
