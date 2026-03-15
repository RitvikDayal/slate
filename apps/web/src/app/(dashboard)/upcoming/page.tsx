import { ViewErrorBoundary } from "@/components/providers/view-error-boundary";
import { UpcomingView } from "@/components/views/upcoming-view";

export default function UpcomingPage() {
  return (
    <ViewErrorBoundary>
      <UpcomingView />
    </ViewErrorBoundary>
  );
}
