import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { getAiQueue } from "@/lib/queue/producer";
import { JOB_NAMES } from "@ai-todo/shared";

export async function POST() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const queue = getAiQueue();
  await queue.add(
    JOB_NAMES.SLACK_SCAN,
    { userId: user!.id },
    {
      jobId: `slack-scan-manual-${user!.id}-${Date.now()}`,
      attempts: 2,
    }
  );

  return NextResponse.json({ status: "queued" }, { status: 202 });
}
