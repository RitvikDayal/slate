import { WebClient, type ConversationsHistoryResponse } from "@slack/web-api";
import { supabase } from "../lib/supabase.ts";
import type { SlackMessage } from "@ai-todo/shared";

export class SlackService {
  private client: WebClient;

  constructor(botToken: string) {
    this.client = new WebClient(botToken);
  }

  static async forUser(userId: string): Promise<SlackService | null> {
    const { data } = await supabase
      .from("user_secrets")
      .select("slack_bot_token")
      .eq("user_id", userId)
      .single();

    if (!data?.slack_bot_token) return null;
    return new SlackService(data.slack_bot_token);
  }

  async getChannelHistory(
    channelId: string,
    oldest?: string,
    limit = 100
  ): Promise<SlackMessage[]> {
    const result: ConversationsHistoryResponse =
      await this.client.conversations.history({
        channel: channelId,
        limit,
        ...(oldest ? { oldest } : {}),
      });

    if (!result.ok || !result.messages) return [];

    return result.messages
      .filter((m) => m.type === "message" && !m.subtype && m.text)
      .map((m) => ({
        ts: m.ts!,
        text: m.text!,
        user: m.user || "unknown",
        channel: channelId,
        thread_ts: m.thread_ts,
      }));
  }

  async getChannelName(channelId: string): Promise<string> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });
      return (
        ((result.channel as Record<string, unknown>)?.name as string) ||
        channelId
      );
    } catch {
      return channelId;
    }
  }

  async listUserChannels(): Promise<Array<{ id: string; name: string }>> {
    const result = await this.client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
    });

    if (!result.ok || !result.channels) return [];

    return result.channels
      .filter((c) => c.is_member && c.id && c.name)
      .map((c) => ({ id: c.id!, name: c.name! }));
  }
}
