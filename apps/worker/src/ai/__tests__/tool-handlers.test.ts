import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

import { handleToolCall } from "../tool-handlers";
import { supabase } from "../../lib/supabase";

describe("handleToolCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle create_task", async () => {
    const mockTask = { id: "test-uuid", title: "Test task" };
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
        }),
      }),
    });

    const result = await handleToolCall(
      "create_task",
      { title: "Test task" },
      { userId: "user-123" }
    );

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.task.title).toBe("Test task");
  });

  it("should return error for unknown tool", async () => {
    const result = await handleToolCall("unknown_tool", {}, { userId: "user-123" });
    expect(JSON.parse(result).error).toContain("Unknown tool");
  });
});
