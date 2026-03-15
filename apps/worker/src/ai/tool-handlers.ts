import { supabase } from "../lib/supabase";
import type { ScheduleSlot } from "@ai-todo/shared";

interface ToolContext {
  userId: string;
}

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  switch (toolName) {
    // New item-based handlers
    case "create_item": return handleCreateItem(toolInput, ctx);
    case "update_item": return handleUpdateItem(toolInput, ctx);
    case "complete_item": return handleCompleteItem(toolInput, ctx);
    case "list_items": return handleListItems(toolInput, ctx);
    case "get_lists": return handleGetLists(ctx);
    // Deprecated aliases (map old task-based calls to new item handlers)
    case "create_task": return handleCreateItem(toolInput, ctx);
    case "update_task": return handleUpdateItem({ item_id: toolInput.task_id, ...toolInput }, ctx);
    case "complete_task": return handleCompleteItem({ item_id: toolInput.task_id, ...toolInput }, ctx);
    case "get_tasks": return handleListItems({ scheduled_date: toolInput.date, ...toolInput }, ctx);
    // Existing handlers
    case "get_calendar_events": return handleGetCalendarEvents(toolInput, ctx);
    case "generate_schedule": return handleGenerateSchedule(toolInput, ctx);
    case "shuffle_schedule": return handleShuffleSchedule(toolInput, ctx);
    case "insert_break": return handleInsertBreak(toolInput, ctx);
    case "estimate_task": return handleEstimateTask(toolInput, ctx);
    case "auto_check_completions": return handleAutoCheckCompletions(toolInput, ctx);
    default: return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function handleCreateItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  // If no list_id provided, default to the user's inbox
  let listId = input.list_id as string | undefined;
  if (!listId) {
    const { data: inbox } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("is_inbox", true)
      .single();
    if (inbox) listId = inbox.id;
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: ctx.userId,
      list_id: listId ?? null,
      title: input.title as string,
      type: (input.type as string) || "task",
      priority: (input.priority as string) || "medium",
      effort: (input.effort as string) || null,
      estimated_minutes: (input.estimated_minutes as number) || null,
      due_date: (input.due_date as string) || null,
      due_time: (input.due_time as string) || null,
      scheduled_date: (input.scheduled_date as string) || null,
      scheduled_start: (input.scheduled_start as string) || null,
      scheduled_end: (input.scheduled_end as string) || null,
      is_movable: input.is_movable !== false,
      ai_notes: (input.ai_notes as string) || (input.description as string) || null,
      source: (input.source as string) || "ai_suggested",
    })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleUpdateItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { item_id, task_id: _taskId, ...updates } = input;
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) updateData[key] = value;
  }
  // Set completed_at when marking as completed
  if (updateData.is_completed === true) {
    updateData.completed_at = new Date().toISOString();
  }
  // Handle legacy status field
  if (updateData.status === "done") {
    updateData.is_completed = true;
    updateData.completed_at = new Date().toISOString();
    delete updateData.status;
  }

  const { data, error } = await supabase
    .from("items")
    .update(updateData)
    .eq("id", item_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleCompleteItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabase
    .from("items")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      ai_notes: (input.completion_notes as string) || null,
    })
    .eq("id", (input.item_id ?? input.task_id) as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleListItems(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  let query = supabase
    .from("items")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (input.list_id) {
    query = query.eq("list_id", input.list_id as string);
  }
  if (input.scheduled_date) {
    query = query.eq("scheduled_date", input.scheduled_date as string);
  }
  if (input.due_date) {
    query = query.eq("due_date", input.due_date as string);
  }
  // By default exclude completed items unless explicitly requested
  if (!input.include_completed) {
    query = query.eq("is_completed", false);
  }

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ items: data });
}

async function handleGetLists(ctx: ToolContext): Promise<string> {
  const { data: lists, error } = await supabase
    .from("lists")
    .select("id, title, icon, is_inbox, is_archived, position")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  if (error) return JSON.stringify({ error: error.message });

  // Get item counts per list
  const listsWithCounts = await Promise.all(
    (lists ?? []).map(async (list) => {
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id)
        .eq("is_completed", false);
      return { ...list, item_count: count ?? 0 };
    })
  );

  return JSON.stringify({ lists: listsWithCounts });
}

async function handleGetCalendarEvents(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const date = input.date as string;
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", ctx.userId)
    .gte("start_time", `${date}T00:00:00`)
    .lte("start_time", `${date}T23:59:59`)
    .order("start_time", { ascending: true });

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ events: data });
}

async function handleGenerateSchedule(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const date = input.date as string;
  const slots = input.slots as ScheduleSlot[];
  const summary = input.summary as string;

  for (const slot of slots) {
    if (slot.type === "task" && slot.ref_id) {
      await supabase
        .from("items")
        .update({ scheduled_start: slot.start, scheduled_end: slot.end, scheduled_date: date })
        .eq("id", slot.ref_id)
        .eq("user_id", ctx.userId);
    }
  }

  const { data: existing } = await supabase
    .from("daily_schedules")
    .select("id, version")
    .eq("user_id", ctx.userId)
    .eq("date", date)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("daily_schedules")
      .update({ plan: slots, ai_summary: summary, version: existing.version + 1, status: "draft" })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, schedule: data });
  } else {
    const { data, error } = await supabase
      .from("daily_schedules")
      .insert({ user_id: ctx.userId, date, plan: slots, ai_summary: summary, status: "draft" })
      .select()
      .single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, schedule: data });
  }
}

async function handleShuffleSchedule(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
  return JSON.stringify({
    instruction: "Fetch current tasks and events for this date, then generate a new optimized schedule considering the reason provided.",
    date: input.date,
    reason: input.reason,
  });
}

async function handleInsertBreak(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const date = input.date as string;
  const { data: schedule } = await supabase
    .from("daily_schedules")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("date", date)
    .single();

  if (!schedule) return JSON.stringify({ error: "No schedule found for this date" });

  const plan = schedule.plan as ScheduleSlot[];
  const afterIndex = (input.after_slot_index as number) ?? plan.length - 1;
  const durationMin = input.duration_minutes as number;
  const blockType = input.type as "break" | "focus";

  const prevSlot = plan[afterIndex];
  if (!prevSlot) return JSON.stringify({ error: "Invalid slot index" });

  const breakStart = new Date(prevSlot.end);
  const breakEnd = new Date(breakStart.getTime() + durationMin * 60_000);

  const breakSlot: ScheduleSlot = {
    start: breakStart.toISOString(),
    end: breakEnd.toISOString(),
    type: blockType,
    ref_id: null,
    title: (input.title as string) || (blockType === "break" ? "Break" : "Focus Time"),
    notes: `AI-inserted ${blockType} block`,
  };

  plan.splice(afterIndex + 1, 0, breakSlot);

  const { data, error } = await supabase
    .from("daily_schedules")
    .update({ plan, version: schedule.version + 1 })
    .eq("id", schedule.id)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, schedule: data });
}

async function handleEstimateTask(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabase
    .from("items")
    .update({
      effort: input.effort as string,
      estimated_minutes: input.estimated_minutes as number,
      ai_notes: (input.reasoning as string) || null,
    })
    .eq("id", input.task_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleAutoCheckCompletions(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const date = input.date as string;
  const now = new Date();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("scheduled_date", date)
    .eq("is_completed", false)
    .lt("scheduled_end", now.toISOString());

  if (!items || items.length === 0) {
    return JSON.stringify({ message: "No items to auto-complete", completed: [] });
  }

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", ctx.userId)
    .lt("end_time", now.toISOString())
    .gte("start_time", `${date}T00:00:00`);

  const completedIds: string[] = [];
  for (const item of items) {
    const typedItem = item as { id: string; title: string };
    const relatedEvent = events?.find(
      (e) => {
        const typedEvent = e as { title: string };
        return typedItem.title.toLowerCase().includes("prep") ||
          typedItem.title.toLowerCase().includes(typedEvent.title.toLowerCase().split(" ")[0]);
      }
    );
    if (relatedEvent) {
      const typedEvent = relatedEvent as { title: string };
      await supabase
        .from("items")
        .update({
          is_completed: true,
          completed_at: now.toISOString(),
          ai_notes: `Auto-completed: related event "${typedEvent.title}" has ended`,
        })
        .eq("id", typedItem.id);
      completedIds.push(typedItem.id);
    }
  }

  return JSON.stringify({ message: `Auto-completed ${completedIds.length} items`, completed: completedIds });
}
