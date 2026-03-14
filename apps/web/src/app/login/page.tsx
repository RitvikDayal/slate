import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">AI Todo</h1>
          <p className="mt-2 text-slate-400">
            Your AI-powered daily planner
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
