import type Anthropic from "@anthropic-ai/sdk";

type Tool = Anthropic.Tool;

export const TASK_TOOLS: Tool[] = [
  {
    name: "create_task",
    description: "Create a new task for the user",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Optional task description" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
        effort: { type: "string", enum: ["xs", "s", "m", "l", "xl"], description: "Estimated effort" },
        estimated_minutes: { type: "number", description: "Estimated duration in minutes" },
        scheduled_date: { type: "string", description: "Date to schedule (YYYY-MM-DD)" },
        scheduled_start: { type: "string", description: "ISO 8601 start time" },
        scheduled_end: { type: "string", description: "ISO 8601 end time" },
        is_movable: { type: "boolean", description: "Whether AI can reschedule this task" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task's properties",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "UUID of the task to update" },
        title: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        effort: { type: "string", enum: ["xs", "s", "m", "l", "xl"] },
        estimated_minutes: { type: "number" },
        scheduled_start: { type: "string" },
        scheduled_end: { type: "string" },
        is_movable: { type: "boolean" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as done",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
        completion_notes: { type: "string", description: "Optional notes about completion" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "get_tasks",
    description: "Fetch tasks for a specific date, optionally filtered by status",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
      },
      required: ["date"],
    },
  },
];

export const CALENDAR_TOOLS: Tool[] = [
  {
    name: "get_calendar_events",
    description: "Fetch Google Calendar events for a specific date",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["date"],
    },
  },
];

export const SCHEDULE_TOOLS: Tool[] = [
  {
    name: "generate_schedule",
    description: "Create an optimized daily schedule from tasks and calendar events. Returns the schedule plan as a JSON array of time slots.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        slots: {
          type: "array",
          description: "Array of time slots for the schedule",
          items: {
            type: "object",
            properties: {
              start: { type: "string", description: "ISO 8601 start time" },
              end: { type: "string", description: "ISO 8601 end time" },
              type: { type: "string", enum: ["calendar_event", "task", "break", "focus"] },
              ref_id: { type: "string", description: "UUID of referenced task or event, null for breaks" },
              title: { type: "string" },
              notes: { type: "string" },
            },
            required: ["start", "end", "type", "title"],
          },
        },
        summary: { type: "string", description: "Brief summary of the schedule" },
      },
      required: ["date", "slots", "summary"],
    },
  },
  {
    name: "shuffle_schedule",
    description: "Re-optimize the remaining schedule for today after a change",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        reason: { type: "string", description: "Why the schedule needs reshuffling" },
      },
      required: ["date", "reason"],
    },
  },
  {
    name: "insert_break",
    description: "Insert a break or focus block into the schedule",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        after_slot_index: { type: "number", description: "Insert after this slot index" },
        duration_minutes: { type: "number", description: "Break duration in minutes" },
        type: { type: "string", enum: ["break", "focus"], description: "Type of block" },
        title: { type: "string", description: "Label for the block" },
      },
      required: ["date", "duration_minutes", "type"],
    },
  },
];

export const INTELLIGENCE_TOOLS: Tool[] = [
  {
    name: "estimate_task",
    description: "Suggest effort level and duration for a task",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
        effort: { type: "string", enum: ["xs", "s", "m", "l", "xl"] },
        estimated_minutes: { type: "number" },
        reasoning: { type: "string", description: "Brief explanation" },
      },
      required: ["task_id", "effort", "estimated_minutes"],
    },
  },
  {
    name: "auto_check_completions",
    description: "Check for tasks that can be auto-completed based on context",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["date"],
    },
  },
];

export const ALL_TOOLS: Tool[] = [
  ...TASK_TOOLS,
  ...CALENDAR_TOOLS,
  ...SCHEDULE_TOOLS,
  ...INTELLIGENCE_TOOLS,
];

export const MORNING_PLAN_TOOLS: Tool[] = [
  ...TASK_TOOLS.filter((t) => t.name === "get_tasks"),
  ...CALENDAR_TOOLS,
  ...SCHEDULE_TOOLS,
  ...INTELLIGENCE_TOOLS.filter((t) => t.name === "estimate_task"),
];

export const CHAT_TOOLS: Tool[] = ALL_TOOLS;

export const EOD_TOOLS: Tool[] = [
  ...TASK_TOOLS.filter((t) => t.name === "get_tasks"),
  ...CALENDAR_TOOLS,
];
