export type SlackSuggestionStatus = "pending" | "accepted" | "dismissed";

export interface SlackTaskSuggestion {
  id: string;
  user_id: string;
  channel_id: string;
  channel_name: string;
  message_ts: string;
  message_text: string;
  suggested_title: string;
  suggested_priority: "low" | "medium" | "high";
  suggested_effort: "xs" | "s" | "m" | "l" | "xl" | null;
  confidence: number; // 0-1
  reasoning: string;
  status: SlackSuggestionStatus;
  task_id: string | null; // linked task if accepted
  created_at: string;
  updated_at: string;
}

export interface SlackMessage {
  ts: string;
  text: string;
  user: string;
  channel: string;
  thread_ts?: string;
}

export interface SlackAnalysisResult {
  is_task: boolean;
  confidence: number;
  title: string;
  priority: "low" | "medium" | "high";
  effort: "xs" | "s" | "m" | "l" | "xl" | null;
  reasoning: string;
}
