import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { slackSuggestionActionSchema } from "@ai-todo/shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = slackSuggestionActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: suggestion, error: fetchError } = await supabase
    .from("slack_task_suggestions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (fetchError || !suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 }
    );
  }

  if (parsed.data.action === "accept") {
    // Create a task from the suggestion
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user!.id,
        title: parsed.data.title || suggestion.suggested_title,
        priority: parsed.data.priority || suggestion.suggested_priority,
        effort: parsed.data.effort || suggestion.suggested_effort,
        source: "slack" as const,
        source_ref: {
          channel_id: suggestion.channel_id,
          channel_name: suggestion.channel_name,
          message_ts: suggestion.message_ts,
        },
        scheduled_date: parsed.data.scheduled_date || null,
        is_movable: true,
      })
      .select()
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Update suggestion status
    await supabase
      .from("slack_task_suggestions")
      .update({ status: "accepted", task_id: task.id })
      .eq("id", id);

    return NextResponse.json({
      suggestion: { ...suggestion, status: "accepted", task_id: task.id },
      task,
    });
  }

  // Dismiss
  const { error: updateError } = await supabase
    .from("slack_task_suggestions")
    .update({ status: "dismissed" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    suggestion: { ...suggestion, status: "dismissed" },
  });
}
