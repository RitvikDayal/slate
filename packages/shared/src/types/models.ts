import type { Tables } from "./supabase";

/** Row type for the `items` table */
export type Item = Tables<"items"> & {
  labels?: Label[];
};

/** Row type for the `lists` table */
export type List = Tables<"lists">;

/** Row type for the `labels` table */
export type Label = Tables<"labels">;

/** Row type for the `item_labels` join table */
export type ItemLabel = Tables<"item_labels">;

/** Priority levels for items */
export type ItemPriority = "none" | "low" | "medium" | "high";

/** Effort levels for items */
export type ItemEffort = "xs" | "s" | "m" | "l" | "xl";

/** Item types */
export type ItemType = "task" | "note" | "heading";
