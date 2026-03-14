import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { getAiQueue } from "@/lib/queue/producer";
import { JOB_NAMES } from "@ai-todo/shared";

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const { date, reason } = body;

  if (!date || !reason) {
    return NextResponse.json(
      { error: "date and reason are required" },
      { status: 400 }
    );
  }

  const queue = getAiQueue();
  await queue.add(
    JOB_NAMES.SCHEDULE_SHUFFLE,
    { userId: user!.id, date, reason },
    {
      jobId: `shuffle-${user!.id}-${date}-${Date.now()}`,
    }
  );

  return NextResponse.json({ queued: true });
}
