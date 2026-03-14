import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { getAiQueue } from "@/lib/queue/producer";
import { JOB_NAMES } from "@ai-todo/shared";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;

  const { data: task, error: dbError } = await supabase
    .from("tasks")
    .select("id, title, description")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (dbError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const queue = getAiQueue();
  await queue.add(
    JOB_NAMES.SMART_ESTIMATE,
    {
      userId: user!.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
    },
    { jobId: `estimate-${task.id}-${Date.now()}` }
  );

  return NextResponse.json({ queued: true });
}
