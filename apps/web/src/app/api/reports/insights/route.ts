import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { getAiQueue } from "@/lib/queue/producer";
import { JOB_NAMES } from "@ai-todo/shared";

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { startDate, endDate } = body as {
    startDate?: string;
    endDate?: string;
  };
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const queue = getAiQueue();
  await queue.add(
    JOB_NAMES.REPORT_INSIGHTS,
    { userId: user!.id, startDate, endDate },
    {
      jobId: `report-insights-${user!.id}-${startDate}-${endDate}`,
      attempts: 2,
    }
  );

  return NextResponse.json({ status: "queued" }, { status: 202 });
}
