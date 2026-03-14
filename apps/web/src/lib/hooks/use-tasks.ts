"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@ai-todo/shared";

export function useTasks(date?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);

    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) {
      setTasks(await res.json());
    }
    setIsLoading(false);
  }, [date]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (input: CreateTaskInput) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      return task;
    }
    throw new Error("Failed to create task");
  };

  const updateTask = async (id: string, input: UpdateTaskInput) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    }
    throw new Error("Failed to update task");
  };

  const completeTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    }
    throw new Error("Failed to complete task");
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return {
    tasks,
    isLoading,
    isPending,
    fetchTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  };
}
