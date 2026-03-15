import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import type { SavedView } from "@ai-todo/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

type FilterValue = string | number | boolean | null;

function buildFilteredQuery(
  supabase: SupabaseClient,
  userId: string,
  savedView: SavedView
) {
  let query = supabase
    .from("items")
    .select("*, item_labels(label_id, labels(*))")
    .eq("user_id", userId);

  for (const rule of savedView.filters) {
    switch (rule.op) {
      case "eq":
        query = query.eq(rule.field, rule.value as FilterValue);
        break;
      case "neq":
        query = query.neq(rule.field, rule.value as FilterValue);
        break;
      case "lt":
        query = query.lt(rule.field, rule.value as string | number);
        break;
      case "gt":
        query = query.gt(rule.field, rule.value as string | number);
        break;
      case "lte":
        query = query.lte(rule.field, rule.value as string | number);
        break;
      case "gte":
        query = query.gte(rule.field, rule.value as string | number);
        break;
      case "contains":
        query = query.contains(rule.field, [rule.value]);
        break;
      case "is_empty":
        query = query.is(rule.field, null);
        break;
      case "is_not_empty":
        query = query.not(rule.field, "is", null);
        break;
    }
  }

  // Apply sort
  const [sortField, sortDir] = savedView.sort_by.split(":");
  query = query.order(sortField ?? "due_date", {
    ascending: sortDir !== "desc",
  });

  return query;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  // Fetch the saved view
  const { data: view, error: viewError } = await supabase
    .from("saved_views")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (viewError)
    return NextResponse.json({ error: "View not found" }, { status: 404 });

  const savedView = view as SavedView;
  const query = buildFilteredQuery(supabase, user.id, savedView);

  const { data, error: dbError } = await query;
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Flatten labels
  const items = ((data as Record<string, unknown>[]) ?? []).map((item) => {
    const itemLabels = item.item_labels as Array<{
      labels: unknown;
    }> | null;
    return {
      ...item,
      item_labels: undefined,
      labels: itemLabels?.map((il) => il.labels).filter(Boolean) ?? [],
    };
  });

  return NextResponse.json(items);
}
