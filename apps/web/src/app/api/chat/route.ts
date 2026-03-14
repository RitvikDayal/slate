import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const rateLimitError = await checkRateLimit(user!.id, "chat");
  if (rateLimitError) return rateLimitError;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    });
  }
  const { messages } = body;

  // Load today's context
  const today = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, priority, effort, estimated_minutes, status, is_movable, scheduled_date, scheduled_start, scheduled_end"
    )
    .eq("user_id", user!.id)
    .eq("scheduled_date", today)
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  const { data: schedule } = await supabase
    .from("daily_schedules")
    .select("*")
    .eq("user_id", user!.id)
    .eq("date", today)
    .single();

  const systemMessage = `You are an AI productivity assistant embedded in a todo/planner app. You help users manage their tasks and daily schedule through natural conversation.

Today is ${today}.

**Current tasks:**
${
  tasks
    ?.map(
      (t: Record<string, unknown>) =>
        `- [${t.id}] "${t.title}" | ${t.status} | ${t.priority} priority | ${t.scheduled_start ? `${t.scheduled_start} - ${t.scheduled_end}` : "unscheduled"}`
    )
    .join("\n") || "No tasks today."
}

**Current schedule:**
${schedule ? `Version ${schedule.version}, status: ${schedule.status}, confirmed: ${schedule.user_confirmed}` : "No schedule generated yet."}

Tone: Friendly, concise, action-oriented. When the user makes a request, use tools immediately. Briefly explain what you did.`;

  // Create Supabase admin client for tool implementations
  const { createClient: createServiceClient } = await import(
    "@supabase/supabase-js"
  );
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemMessage,
    messages,
    tools: {
      createTask: tool({
        description: "Create a new task",
        inputSchema: z.object({
          title: z.string().describe("Task title"),
          priority: z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("Priority level"),
          scheduled_date: z.string().optional().describe("Date YYYY-MM-DD"),
          estimated_minutes: z
            .number()
            .optional()
            .describe("Duration estimate"),
        }),
        execute: async ({
          title,
          priority,
          scheduled_date,
          estimated_minutes,
        }) => {
          const { data, error: insertError } = await adminClient
            .from("tasks")
            .insert({
              user_id: user!.id,
              title,
              priority: priority || "medium",
              scheduled_date: scheduled_date || today,
              estimated_minutes,
              source: "ai_suggested",
            })
            .select()
            .single();
          if (insertError) return { error: insertError.message };
          return { success: true, task: { id: data.id, title: data.title } };
        },
      }),
      completeTask: tool({
        description: "Mark a task as done",
        inputSchema: z.object({
          task_id: z.string().describe("Task UUID"),
        }),
        execute: async ({ task_id }) => {
          const { data, error: updateError } = await adminClient
            .from("tasks")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
            })
            .eq("id", task_id)
            .eq("user_id", user!.id)
            .select()
            .single();
          if (updateError) return { error: updateError.message };
          return { success: true, task: { id: data.id, title: data.title } };
        },
      }),
      updateTask: tool({
        description: "Update task properties",
        inputSchema: z.object({
          task_id: z.string().describe("Task UUID"),
          title: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
          scheduled_start: z.string().optional(),
          scheduled_end: z.string().optional(),
          status: z
            .enum(["pending", "in_progress", "done", "cancelled"])
            .optional(),
        }),
        execute: async ({ task_id, ...updates }) => {
          const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
          );
          const { data, error: updateError } = await adminClient
            .from("tasks")
            .update(cleanUpdates)
            .eq("id", task_id)
            .eq("user_id", user!.id)
            .select()
            .single();
          if (updateError) return { error: updateError.message };
          return { success: true, task: { id: data.id, title: data.title } };
        },
      }),
      getTasks: tool({
        description: "Get tasks for a date",
        inputSchema: z.object({
          date: z.string().describe("Date YYYY-MM-DD"),
          status: z
            .enum(["pending", "in_progress", "done", "cancelled"])
            .optional(),
        }),
        execute: async ({ date, status: taskStatus }) => {
          let query = adminClient
            .from("tasks")
            .select(
              "id, title, priority, status, scheduled_start, scheduled_end, estimated_minutes"
            )
            .eq("user_id", user!.id)
            .eq("scheduled_date", date);
          if (taskStatus) query = query.eq("status", taskStatus);
          const { data, error: queryError } = await query;
          if (queryError) return { error: queryError.message };
          return { tasks: data };
        },
      }),
      shuffleSchedule: tool({
        description: "Request a schedule reshuffle",
        inputSchema: z.object({
          reason: z
            .string()
            .describe("Why the schedule needs reshuffling"),
        }),
        execute: async ({ reason }) => {
          const { getAiQueue } = await import("@/lib/queue/producer");
          const queue = getAiQueue();
          await queue.add("schedule-shuffle", {
            userId: user!.id,
            date: today,
            reason,
          });
          return { success: true, message: "Schedule reshuffle queued" };
        },
      }),
    },
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, toolCalls, toolResults }) => {
      await adminClient.from("chat_messages").insert({
        user_id: user!.id,
        date: today,
        role: "assistant",
        content: text,
        tool_calls: toolCalls
          ? JSON.parse(JSON.stringify(toolCalls))
          : null,
        tool_results: toolResults
          ? JSON.parse(JSON.stringify(toolResults))
          : null,
      });
    },
  });

  // Persist user message
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === "user") {
    await adminClient.from("chat_messages").insert({
      user_id: user!.id,
      date: today,
      role: "user",
      content:
        typeof lastUserMessage.content === "string"
          ? lastUserMessage.content
          : JSON.stringify(lastUserMessage.content),
    });
  }

  return result.toUIMessageStreamResponse();
}
