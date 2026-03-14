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
    case "create_task": return handleCreateTask(toolInput, ctx);
    case "update_task": return handleUpdateTask(toolInput, ctx);
    case "complete_task": return handleCompleteTask(toolInput, ctx);
    case "get_tasks": return handleGetTasks(toolInput, ctx);
    case "get_calendar_events": return handleGetCalendarEvents(toolInput, ctx);
    case "generate_schedule": return handleGenerateSchedule(toolInput, ctx);
    case "shuffle_schedule": return handleShuffleSchedule(toolInput, ctx);
    case "insert_break": return handleInsertBreak(toolInput, ctx);
    case "estimate_task": return handleEstimateTask(toolInput, ctx);
    case "auto_check_completions": return handleAutoCheckCompletions(toolInput, ctx);
    default: return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function handleCreateTask(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: ctx.userId,
      title: input.title as string,
      description: (input.description as string) || null,
      priority: (input.priority as string) || "medium",
      effort: (input.effort as string) || null,
      estimated_minutes: (input.estimated_minutes as number) || null,
      scheduled_date: (input.scheduled_date as string) || null,
      scheduled_start: (input.scheduled_start as string) || null,
      scheduled_end: (input.scheduled_end as string) || null,
      is_movable: input.is_movable !== false,
      source: "ai_suggested",
    })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, task: data });
}

async function handleUpdateTask(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { task_id, ...updates } = input;
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (updateData.status === "done") {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", task_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, task: data });
}

async function handleCompleteTask(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      ai_notes: (input.completion_notes as string) || null,
    })
    .eq("id", input.task_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, task: data });
}

async function handleGetTasks(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("scheduled_date", input.date as string)
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (input.status) {
    query = query.eq("status", input.status as string);
  }

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ tasks: data });
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
        .from("tasks")
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
    .from("tasks")
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
  return JSON.stringify({ success: true, task: data });
}

async function handleAutoCheckCompletions(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const date = input.date as string;
  const now = new Date();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("scheduled_date", date)
    .in("status", ["pending", "in_progress"])
    .lt("scheduled_end", now.toISOString());

  if (!tasks || tasks.length === 0) {
    return JSON.stringify({ message: "No tasks to auto-complete", completed: [] });
  }

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", ctx.userId)
    .lt("end_time", now.toISOString())
    .gte("start_time", `${date}T00:00:00`);

  const completedIds: string[] = [];
  for (const task of tasks) {
    const relatedEvent = events?.find(
      (e: any) =>
        task.title.toLowerCase().includes("prep") ||
        task.title.toLowerCase().includes(e.title.toLowerCase().split(" ")[0])
    );
    if (relatedEvent) {
      await supabase
        .from("tasks")
        .update({ status: "done", completed_at: now.toISOString(), ai_notes: `Auto-completed: related event "${relatedEvent.title}" has ended` })
        .eq("id", task.id);
      completedIds.push(task.id);
    }
  }

  return JSON.stringify({ message: `Auto-completed ${completedIds.length} tasks`, completed: completedIds });
}
