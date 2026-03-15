import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { startOfWeek, endOfWeek, format, subDays } from "date-fns";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekEnd = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  let query = supabase
    .from("items")
    .select("*, item_labels(label_id, labels(*))")
    .eq("user_id", user.id);

  switch (slug) {
    case "high-priority":
      query = query.eq("priority", "high").eq("is_completed", false);
      break;
    case "due-this-week":
      query = query
        .gte("due_date", weekStart)
        .lte("due_date", weekEnd)
        .eq("is_completed", false);
      break;
    case "overdue":
      query = query.lt("due_date", today).eq("is_completed", false);
      break;
    case "no-date":
      query = query.is("due_date", null).eq("is_completed", false);
      break;
    case "completed":
      query = query
        .eq("is_completed", true)
        .gte("completed_at", format(subDays(new Date(), 30), "yyyy-MM-dd"));
      break;
    default:
      return NextResponse.json({ error: "Unknown view" }, { status: 404 });
  }

  const { data, error: dbError } = await query.order("position", {
    ascending: true,
  });
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Flatten labels
  const items = (data ?? []).map(
    (item: Record<string, unknown>) => {
      const itemLabels = item.item_labels as Array<{
        labels: unknown;
      }> | null;
      return {
        ...item,
        item_labels: undefined,
        labels: itemLabels?.map((il) => il.labels).filter(Boolean) ?? [],
      };
    }
  );

  return NextResponse.json(items);
}
