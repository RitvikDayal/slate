"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTaskInput, TaskPriority, TaskEffort } from "@ai-todo/shared";

interface TaskDetailDialogProps {
  trigger: React.ReactNode;
  onSubmit: (input: CreateTaskInput) => Promise<unknown>;
}

export function TaskDetailDialog({ trigger, onSubmit }: TaskDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [effort, setEffort] = useState<TaskEffort | "">("");
  const [dueDate, setDueDate] = useState("");
  const [isMovable, setIsMovable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description || undefined,
        priority,
        effort: effort || undefined,
        is_movable: isMovable,
        due_date: dueDate || undefined,
      });
      setTitle(""); setDescription(""); setPriority("medium");
      setEffort(""); setDueDate(""); setIsMovable(true);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title" required />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea id="description" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Effort</label>
              <Select value={effort} onValueChange={(v) => setEffort(v as TaskEffort)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">XS (~15min)</SelectItem>
                  <SelectItem value="s">S (~30min)</SelectItem>
                  <SelectItem value="m">M (~1hr)</SelectItem>
                  <SelectItem value="l">L (~2hr)</SelectItem>
                  <SelectItem value="xl">XL (~4hr+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="due_date" className="text-sm font-medium">Due Date</label>
            <Input id="due_date" type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="movable" className="text-sm font-medium">AI can reschedule</label>
            <input type="checkbox" id="movable" checked={isMovable} onChange={(e) => setIsMovable(e.target.checked)} className="h-4 w-4" />
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500"
            disabled={!title.trim() || isSubmitting}>
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
