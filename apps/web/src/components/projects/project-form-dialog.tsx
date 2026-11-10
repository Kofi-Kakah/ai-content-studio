"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_DEFS,
  createProjectSchema,
  type CreateProjectInput,
  type ProjectDto,
  type ProjectTypeId,
} from "@studio/shared";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ModeIcon } from "@/components/mode-icon";
import { toast } from "@/components/ui/toast";
import { useCreateProject, useUpdateProject } from "@/lib/queries";

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  defaultType = "blog_posts",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDto;
  defaultType?: ProjectTypeId;
}) {
  const create = useCreateProject();
  const update = useUpdateProject();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      type: project?.type ?? defaultType,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
        type: project?.type ?? defaultType,
      });
    }
  }, [open, project, defaultType, form]);

  const onSubmit = async (values: CreateProjectInput) => {
    try {
      if (project) {
        await update.mutateAsync({ id: project.id, ...values, description: values.description || null });
        toast.add({ title: "Project updated", type: "success" });
      } else {
        await create.mutateAsync({ ...values, description: values.description || null });
        toast.add({ title: "Project created", description: values.name, type: "success" });
      }
      onOpenChange(false);
    } catch (err) {
      toast.add({
        title: "Could not save project",
        description: (err as Error).message,
        type: "error",
      });
    }
  };

  const type = form.watch("type");
  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Projects keep your content organized by goal and format.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Q1 Launch Campaign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="What is this project about?"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {PROJECT_TYPES.map((id) => {
                      const def = PROJECT_TYPE_DEFS[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => field.onChange(id)}
                          className={cn(
                            "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all hover:bg-muted/50",
                            type === id && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-[13px] font-medium">
                            <ModeIcon name={def.icon} className="size-3.5" />
                            {def.label}
                          </span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {def.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2Icon className="animate-spin" /> : null}
                {project ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
