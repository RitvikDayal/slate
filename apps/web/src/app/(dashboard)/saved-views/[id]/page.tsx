"use client";

import { useParams } from "next/navigation";
import { SavedViewPage } from "@/components/views/saved-view-page";

export default function SavedViewRoute() {
  const params = useParams<{ id: string }>();
  return <SavedViewPage viewId={params.id} />;
}
