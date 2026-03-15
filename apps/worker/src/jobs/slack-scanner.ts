import { Job } from "bullmq";
import { supabase } from "../lib/supabase.ts";
import { SlackService } from "../services/slack.ts";
import { analyzeSlackMessages } from "../ai/slack-analyzer.ts";
import { redis } from "../lib/redis.ts";
import type { SlackScannerJobData, SlackMessage } from "@ai-todo/shared";

export async function processSlackScan(job: Job<SlackScannerJobData>) {
  const { userId } = job.data;

  // Get user's configured Slack channels
  const { data: profile } = await supabase
    .from("profiles")
    .select("slack_channels")
    .eq("id", userId)
    .single();

  const channels = profile?.slack_channels;
  if (!channels || channels.length === 0) {
    return { success: true, scanned: 0, suggestions: 0 };
  }

  const slack = await SlackService.forUser(userId);
  if (!slack) {
    return { success: false, error: "No Slack token configured" };
  }

  let totalSuggestions = 0;

  for (const channelId of channels) {
    // Get last scan timestamp from Redis
    const lastScanKey = `slack:last_scan:${userId}:${channelId}`;
    const lastScanTs = await redis.get(lastScanKey);

    // Fetch messages since last scan (or last 24h)
    const oldest = lastScanTs || String(Date.now() / 1000 - 86400);
    const messages: SlackMessage[] = await slack.getChannelHistory(
      channelId,
      oldest
    );

    if (messages.length === 0) continue;

    // Get channel name for display
    const channelName = await slack.getChannelName(channelId);

    // Analyze messages with AI
    const analyses = await analyzeSlackMessages(userId, messages);

    // Store suggestions using message_index to map back to original messages
    for (const analysis of analyses) {
      const msg = messages[analysis.message_index - 1]; // 1-based to 0-based
      if (!msg) continue;

      const { error } = await supabase
        .from("slack_task_suggestions")
        .upsert(
          {
            user_id: userId,
            channel_id: channelId,
            channel_name: channelName,
            message_ts: msg.ts,
            message_text: msg.text.slice(0, 2000),
            suggested_title: analysis.title,
            suggested_priority: analysis.priority,
            suggested_effort: analysis.effort,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
          },
          { onConflict: "user_id,channel_id,message_ts", ignoreDuplicates: true }
        );

      if (!error) totalSuggestions++;
    }

    // Update last scan timestamp
    const latestTs = messages[0]?.ts;
    if (latestTs) {
      await redis.set(lastScanKey, latestTs, "EX", 86400 * 7);
    }
  }

  return {
    success: true,
    scanned: channels.length,
    suggestions: totalSuggestions,
  };
}
