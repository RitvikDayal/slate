import { ViewErrorBoundary } from "@/components/providers/view-error-boundary";
import { InboxView } from "@/components/views/inbox-view";

export default function InboxPage() {
  return (
    <ViewErrorBoundary>
      <InboxView />
    </ViewErrorBoundary>
  );
}
