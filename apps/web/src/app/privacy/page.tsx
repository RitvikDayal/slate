import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Slate",
  description: "Privacy policy for Slate, your AI-powered daily planner.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-16">
        <div>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to login
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: March 15, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              What Data We Collect
            </h2>
            <p>When you use Slate, we collect the following information:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-foreground">Google profile info</strong>{" "}
                — your name, email address, and profile picture via Google
                OAuth.
              </li>
              <li>
                <strong className="text-foreground">Google Calendar data</strong>{" "}
                — read-only access to your calendar events for scheduling
                features.
              </li>
              <li>
                <strong className="text-foreground">Tasks and content</strong> —
                tasks, notes, and other content you create within Slate.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              How We Use Your Data
            </h2>
            <p>Your data is used solely to provide and improve the service:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Displaying your tasks and generating AI-powered daily plans.
              </li>
              <li>
                Syncing with your Google Calendar to provide scheduling context.
              </li>
              <li>Authenticating your account and maintaining your session.</li>
            </ul>
            <p>We do not sell your data or use it for advertising.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Third-Party Services
            </h2>
            <p>Slate uses the following third-party services:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-foreground">Supabase</strong> —
                authentication and database storage.
              </li>
              <li>
                <strong className="text-foreground">OpenAI</strong> — AI
                features including task planning and scheduling suggestions.
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> — hosting
                and deployment.
              </li>
            </ul>
            <p>
              These services process your data according to their own privacy
              policies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Data Retention & Deletion
            </h2>
            <p>
              Your data is retained for as long as your account is active. If
              you delete your account, all associated data — including tasks,
              preferences, and stored tokens — will be permanently deleted from
              our systems.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
            <p>
              We use industry-standard security measures including encrypted
              connections (TLS), row-level security on all database tables, and
              secure token storage. OAuth tokens are stored server-side and are
              never exposed to the client.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p>
              If you have questions about this privacy policy or your data,
              please contact us at{" "}
              <a
                href="mailto:privacy@gleomento.com"
                className="text-foreground underline underline-offset-4 hover:opacity-80"
              >
                privacy@gleomento.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
