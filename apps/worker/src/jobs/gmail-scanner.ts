import type { Job } from "bullmq";
import type { GmailScanJobData } from "@ai-todo/shared";

/**
 * Gmail scanner job — scans starred/labeled emails and creates items.
 *
 * This is a skeleton implementation. The actual Gmail API calls will be
 * implemented when Google OAuth scopes include gmail.readonly and the
 * OAuth flow stores refresh tokens in user_secrets.
 *
 * Flow:
 * 1. Get user's Gmail tokens from user_secrets (service_role client)
 * 2. Check token expiry, refresh if needed
 * 3. Fetch starred/labeled emails via Gmail API
 * 4. Deduplicate by gmail message ID in source_ref
 * 5. Create items with source: 'gmail'
 */
export async function processGmailScan(job: Job<GmailScanJobData>) {
  const { userId } = job.data;

  job.log(`[gmail-scanner] Starting scan for user ${userId}`);

  // TODO: Implement actual Gmail API calls when OAuth flow is complete
  // The structure is ready for when Google OAuth scopes include gmail.readonly

  job.log(`[gmail-scanner] Scan complete for user ${userId} (skeleton — no-op)`);

  return {
    success: true,
    scanned: 0,
    created: 0,
    message: "Gmail scanner skeleton — no-op until OAuth is configured",
  };
}
