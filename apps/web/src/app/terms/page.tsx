import type { Metadata } from "next";
import Link from "next/link";
import { SlateLogo } from "@/components/brand/slate-logo";

export const metadata: Metadata = {
  title: "Terms of Service — Slate",
  description: "Terms of service for Slate, your AI-powered daily planner.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-16">
        <div>
          <Link href="/login" className="inline-block">
            <SlateLogo size="sm" />
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: March 15, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Service Description
            </h2>
            <p>
              Slate is an AI-powered daily planner that helps you manage tasks,
              sync with your calendar, and plan your day. The service is provided
              as-is and may be updated or modified at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              User Responsibilities
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                You are responsible for maintaining the security of your account.
              </li>
              <li>
                You agree not to misuse the service, including attempting to
                access data belonging to other users.
              </li>
              <li>
                You agree not to use the service for any unlawful purpose.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Intellectual Property
            </h2>
            <p>
              You retain full ownership of all content you create within Slate,
              including tasks, notes, and any other data. We claim no
              intellectual property rights over your content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              AI-Generated Content
            </h2>
            <p>
              Slate uses AI to generate suggestions, schedules, and plans. These
              are provided for informational purposes and should not be relied
              upon as professional advice. You are responsible for reviewing and
              acting on any AI-generated content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Limitation of Liability
            </h2>
            <p>
              Slate is provided &ldquo;as is&rdquo; without warranties of any
              kind, express or implied. We are not liable for any damages arising
              from your use of the service, including but not limited to data
              loss, missed deadlines, or inaccurate AI suggestions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Termination
            </h2>
            <p>
              You may stop using the service and delete your account at any
              time. We reserve the right to suspend or terminate accounts that
              violate these terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of
              Slate after changes constitutes acceptance of the updated terms. We
              will make reasonable efforts to notify users of significant
              changes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p>
              If you have questions about these terms, please contact us at{" "}
              <a
                href="mailto:support@gleomento.com"
                className="text-foreground underline underline-offset-4 hover:opacity-80"
              >
                support@gleomento.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
