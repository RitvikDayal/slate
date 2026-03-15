import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, error } = await getAuthenticatedUser();
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

  // Create Supabase admin client for tool implementations and context queries
  const { createClient: createServiceClient } = await import(
    "@supabase/supabase-js"
  );
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Load today's context
  const today = new Date().toISOString().split("T")[0];

  const { data: items } = await adminClient
    .from("items")
    .select("id, title, type, priority, effort, estimated_minutes, is_completed, is_movable, scheduled_date, scheduled_start, scheduled_end, list_id")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .or(`scheduled_date.eq.${today},due_date.eq.${today}`)
    .order("position");

  const { data: schedule } = await adminClient
    .from("daily_schedules")
    .select("*")
    .eq("user_id", user!.id)
    .eq("date", today)
    .single();

  const systemMessage = `You are an AI productivity assistant embedded in a todo/planner app. You help users manage their items and daily schedule through natural conversation.

Today is ${today}.

**Current items:**
${
  items
    ?.map(
      (t: Record<string, unknown>) =>
        `- [${t.id}] "${t.title}" | ${t.is_completed ? "completed" : "active"} | ${t.priority} priority | ${t.scheduled_start ? `${t.scheduled_start} - ${t.scheduled_end}` : "unscheduled"}`
    )
    .join("\n") || "No items today."
}

**Current schedule:**
${schedule ? `Version ${schedule.version}, status: ${schedule.status}, confirmed: ${schedule.user_confirmed}` : "No schedule generated yet."}

Tone: Friendly, concise, action-oriented. When the user makes a request, use tools immediately. Briefly explain what you did.`;

  const result = streamText({
    model: openai.chat("gpt-4o-mini"),
    system: systemMessage,
    messages,
    tools: {
      createItem: tool({
        description: "Create a new task or item",
        inputSchema: z.object({
          title: z.string().describe("Item title"),
          list_id: z.string().uuid().optional().describe("List UUID"),
          priority: z.enum(["none", "low", "medium", "high"]).optional(),
          due_date: z.string().optional().describe("Date YYYY-MM-DD"),
          estimated_minutes: z.number().optional(),
        }),
        execute: async ({ title, list_id, priority, due_date, estimated_minutes }) => {
          let targetListId = list_id;
          if (!targetListId) {
            const { data: inbox } = await adminClient
              .from("lists").select("id").eq("user_id", user!.id).eq("is_inbox", true).single();
            targetListId = inbox?.id;
          }
          const { data, error: insertError } = await adminClient
            .from("items")
            .insert({
              user_id: user!.id,
              list_id: targetListId,
              title,
              type: "task",
              priority: priority || "none",
              due_date: due_date || null,
              estimated_minutes,
              source: "ai_suggested",
            })
            .select()
            .single();
          if (insertError) return { error: insertError.message };
          return { success: true, item: { id: data.id, title: data.title } };
        },
      }),
      completeItem: tool({
        description: "Mark an item as done",
        inputSchema: z.object({
          item_id: z.string().describe("Item UUID"),
        }),
        execute: async ({ item_id }) => {
          const { data, error: updateError } = await adminClient
            .from("items")
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq("id", item_id)
            .eq("user_id", user!.id)
            .select()
            .single();
          if (updateError) return { error: updateError.message };
          return { success: true, item: { id: data.id, title: data.title } };
        },
      }),
      updateItem: tool({
        description: "Update item properties",
        inputSchema: z.object({
          item_id: z.string().describe("Item UUID"),
          title: z.string().optional(),
          priority: z.enum(["none", "low", "medium", "high"]).optional(),
          scheduled_start: z.string().optional(),
          scheduled_end: z.string().optional(),
          is_completed: z.boolean().optional(),
        }),
        execute: async ({ item_id, ...updates }) => {
          const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
          );
          const { data, error: updateError } = await adminClient
            .from("items")
            .update(cleanUpdates)
            .eq("id", item_id)
            .eq("user_id", user!.id)
            .select()
            .single();
          if (updateError) return { error: updateError.message };
          return { success: true, item: { id: data.id, title: data.title } };
        },
      }),
      listItems: tool({
        description: "Get items for a date",
        inputSchema: z.object({
          date: z.string().describe("Date YYYY-MM-DD"),
          is_completed: z.boolean().optional(),
        }),
        execute: async ({ date, is_completed }) => {
          let query = adminClient
            .from("items")
            .select(
              "id, title, type, priority, is_completed, scheduled_start, scheduled_end, estimated_minutes"
            )
            .eq("user_id", user!.id)
            .eq("is_archived", false)
            .or(`scheduled_date.eq.${date},due_date.eq.${date}`);
          if (is_completed !== undefined) query = query.eq("is_completed", is_completed);
          const { data, error: queryError } = await query;
          if (queryError) return { error: queryError.message };
          return { items: data };
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
