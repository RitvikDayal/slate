import type { ScheduleSlot } from "@ai-todo/shared";

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  primary: "#818cf8",
  success: "#34d399",
  warning: "#fbbf24",
};

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:${COLORS.card};border-radius:12px;border:1px solid ${COLORS.border};">
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:24px;color:${COLORS.primary};">${title}</h1>
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid ${COLORS.border};">
          <p style="margin:0;font-size:12px;color:${COLORS.textMuted};text-align:center;">
            AI Todo &mdash; Your intelligent task manager
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function renderMorningPlanEmail(
  userName: string,
  date: string,
  slots: ScheduleSlot[],
  summary: string
): string {
  const slotRows = slots
    .map(
      (slot) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.textMuted};font-size:13px;white-space:nowrap;">
        ${formatTime(slot.start)} &ndash; ${formatTime(slot.end)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${
          slot.type === "task"
            ? COLORS.primary
            : slot.type === "break"
              ? COLORS.success
              : slot.type === "focus"
                ? COLORS.warning
                : COLORS.textMuted
        };margin-right:8px;"></span>
        ${slot.title}
      </td>
    </tr>`
    )
    .join("");

  const content = `
    <p style="color:${COLORS.text};font-size:16px;margin:0 0 16px;">
      Good morning${userName ? `, ${userName}` : ""}! Here's your plan for <strong>${date}</strong>.
    </p>
    <p style="color:${COLORS.textMuted};font-size:14px;margin:0 0 24px;">${summary}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};border-radius:8px;overflow:hidden;">
      ${slotRows}
    </table>
  `;

  return baseLayout("Your Morning Plan", content);
}

export function renderEodReportEmail(
  userName: string,
  date: string,
  report: {
    tasks_completed: number;
    tasks_pending: number;
    total_focus_minutes: number;
    ai_summary: string;
  }
): string {
  const focusHours = Math.floor(report.total_focus_minutes / 60);
  const focusMinutes = report.total_focus_minutes % 60;
  const focusDisplay =
    focusHours > 0
      ? `${focusHours}h ${focusMinutes}m`
      : `${focusMinutes}m`;

  const content = `
    <p style="color:${COLORS.text};font-size:16px;margin:0 0 24px;">
      Here's your end-of-day summary for <strong>${date}</strong>${userName ? `, ${userName}` : ""}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="33%" style="padding:16px;background-color:${COLORS.bg};border-radius:8px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:${COLORS.success};">${report.tasks_completed}</div>
          <div style="font-size:12px;color:${COLORS.textMuted};margin-top:4px;">Completed</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="padding:16px;background-color:${COLORS.bg};border-radius:8px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:${COLORS.warning};">${report.tasks_pending}</div>
          <div style="font-size:12px;color:${COLORS.textMuted};margin-top:4px;">Pending</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="padding:16px;background-color:${COLORS.bg};border-radius:8px;text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:${COLORS.primary};">${focusDisplay}</div>
          <div style="font-size:12px;color:${COLORS.textMuted};margin-top:4px;">Focus Time</div>
        </td>
      </tr>
    </table>
    <div style="padding:16px;background-color:${COLORS.bg};border-radius:8px;border-left:3px solid ${COLORS.primary};">
      <p style="color:${COLORS.text};font-size:14px;margin:0;line-height:1.6;">${report.ai_summary}</p>
    </div>
  `;

  return baseLayout("End of Day Report", content);
}

export function renderTaskReminderEmail(
  taskTitle: string,
  scheduledStart: string
): string {
  const content = `
    <p style="color:${COLORS.text};font-size:16px;margin:0 0 24px;">
      You have an upcoming task starting soon:
    </p>
    <div style="padding:20px;background-color:${COLORS.bg};border-radius:8px;border-left:3px solid ${COLORS.warning};">
      <h2 style="margin:0 0 8px;font-size:18px;color:${COLORS.text};">${taskTitle}</h2>
      <p style="margin:0;font-size:14px;color:${COLORS.textMuted};">
        Scheduled for <strong style="color:${COLORS.warning};">${formatTime(scheduledStart)}</strong>
      </p>
    </div>
  `;

  return baseLayout("Upcoming Task Reminder", content);
}
