import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createItemSchema } from "@ai-todo/shared";

export async function GET(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("list_id");
  let query = supabase
    .from("items")
    .select("*, item_labels(label_id, labels(*))")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position");
  if (listId) query = query.eq("list_id", listId);
  const { data, error: dbError } = await query;
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  const itemsWithLabels = (data || []).map((item: Record<string, unknown>) => ({
    ...item,
    labels: (item.item_labels as { labels: unknown }[] | undefined)?.map((il) => il.labels).filter(Boolean) ?? [],
  }));
  itemsWithLabels.forEach((item: Record<string, unknown>) => delete item.item_labels);

  return NextResponse.json(itemsWithLabels);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { label_ids, ...itemData } = parsed.data;
  const { data, error: dbError } = await supabase
    .from("items")
    .insert({ ...itemData, user_id: user.id })
    .select()
    .single();
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (label_ids && label_ids.length > 0) {
    await supabase
      .from("item_labels")
      .insert(label_ids.map((lid) => ({ item_id: data.id, label_id: lid })));
  }
  // Re-fetch with labels
  const { data: fullItem, error: fetchError } = await supabase
    .from("items")
    .select("*, item_labels(label_id, labels(*))")
    .eq("id", data.id)
    .single();

  if (fetchError) return NextResponse.json(data, { status: 201 });

  // Transform labels into flat array
  const itemWithLabels = {
    ...fullItem,
    labels: fullItem.item_labels?.map((il: { labels: unknown }) => il.labels).filter(Boolean) ?? [],
  };
  delete (itemWithLabels as Record<string, unknown>).item_labels;

  return NextResponse.json(itemWithLabels, { status: 201 });
}
