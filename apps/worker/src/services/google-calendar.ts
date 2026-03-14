import type { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export class TokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenRefreshError";
  }
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  status?: string;
}

interface GoogleEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export class GoogleCalendarService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async getAccessToken(): Promise<string> {
    const { data: secrets, error } = await this.supabase
      .from("user_secrets")
      .select(
        "google_access_token, google_refresh_token, google_token_expires_at"
      )
      .eq("user_id", this.userId)
      .single();

    if (error || !secrets) {
      throw new TokenRefreshError(
        "No Google credentials found for user. Please reconnect Google Calendar."
      );
    }

    if (!secrets.google_refresh_token) {
      throw new TokenRefreshError(
        "No refresh token found. Please reconnect Google Calendar."
      );
    }

    // Check if cached token is still valid (with 5-min buffer)
    if (
      secrets.google_access_token &&
      secrets.google_token_expires_at
    ) {
      const expiresAt = new Date(secrets.google_token_expires_at).getTime();
      if (Date.now() + TOKEN_BUFFER_MS < expiresAt) {
        return secrets.google_access_token;
      }
    }

    // Refresh the token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: secrets.google_refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 400 || status === 401) {
        throw new TokenRefreshError(
          `Google token refresh failed (${status}). Please reconnect Google Calendar.`
        );
      }
      throw new Error(
        `Google token refresh failed with status ${status}: ${await response.text()}`
      );
    }

    const tokenData: GoogleTokenResponse = await response.json();
    const expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();

    // Store new access token and expiry
    const { error: updateError } = await this.supabase
      .from("user_secrets")
      .update({
        google_access_token: tokenData.access_token,
        google_token_expires_at: expiresAt,
      })
      .eq("user_id", this.userId);

    if (updateError) {
      console.error("Failed to update token in user_secrets:", updateError);
    }

    return tokenData.access_token;
  }

  async fetchEvents(
    timeMin: Date,
    timeMax: Date
  ): Promise<GoogleCalendarEvent[]> {
    const accessToken = await this.getAccessToken();
    const allEvents: GoogleCalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          throw new TokenRefreshError(
            "Google API returned 401. Please reconnect Google Calendar."
          );
        }
        throw new Error(
          `Google Calendar API error (${status}): ${await response.text()}`
        );
      }

      const data: GoogleEventsResponse = await response.json();
      const activeEvents = (data.items || []).filter(
        (e) => e.status !== "cancelled"
      );
      allEvents.push(...activeEvents);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allEvents;
  }

  async syncEvents(timeMin: Date, timeMax: Date): Promise<{ synced: number; deleted: number }> {
    const events = await this.fetchEvents(timeMin, timeMax);
    const now = new Date().toISOString();

    // Map Google events to calendar_events table shape
    const rows = events.map((event) => {
      const isAllDay = !event.start.dateTime;
      const startTime = event.start.dateTime || `${event.start.date}T00:00:00Z`;
      const endTime = event.end.dateTime || `${event.end.date}T00:00:00Z`;

      return {
        user_id: this.userId,
        google_event_id: event.id,
        title: event.summary || "(No title)",
        description: event.description || null,
        start_time: startTime,
        end_time: endTime,
        is_all_day: isAllDay,
        location: event.location || null,
        synced_at: now,
      };
    });

    let synced = 0;

    // Upsert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await this.supabase
        .from("calendar_events")
        .upsert(batch, {
          onConflict: "user_id,google_event_id",
        });

      if (error) {
        throw new Error(`Failed to upsert calendar events: ${error.message}`);
      }
      synced += batch.length;
    }

    // Delete events in this range that no longer exist in Google
    const googleEventIds = events.map((e) => e.id);

    let deleted = 0;
    if (googleEventIds.length > 0) {
      // Delete events in the time range that are not in the Google response
      const { data: deletedRows, error: deleteError } = await this.supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", this.userId)
        .gte("start_time", timeMin.toISOString())
        .lte("start_time", timeMax.toISOString())
        .not("google_event_id", "in", `(${googleEventIds.join(",")})`)
        .select("id");

      if (deleteError) {
        console.error("Failed to delete stale events:", deleteError);
      }
      deleted = deletedRows?.length || 0;
    } else {
      // No events from Google in this range — delete all user events in range
      const { data: deletedRows, error: deleteError } = await this.supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", this.userId)
        .gte("start_time", timeMin.toISOString())
        .lte("start_time", timeMax.toISOString())
        .select("id");

      if (deleteError) {
        console.error("Failed to delete stale events:", deleteError);
      }
      deleted = deletedRows?.length || 0;
    }

    return { synced, deleted };
  }
}
