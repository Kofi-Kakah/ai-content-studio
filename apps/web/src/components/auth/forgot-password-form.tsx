"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@studio/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const [devLink, setDevLink] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    const res = await api<{ ok: boolean; devLink?: string }>("/auth/forgot-password", {
      method: "POST",
      json: values,
    });
    setDevLink(res.devLink ?? null);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MailCheckIcon className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{form.getValues("email")}</span>,
          a password reset link is on its way. It expires in 48 hours.
        </p>
        {devLink ? (
          <div className="rounded-lg bg-muted p-3 text-xs">
            <p className="mb-1 font-medium">Dev mode — Resend not configured:</p>
            <a href={devLink} className="break-all text-blue-600 underline dark:text-blue-400">
              {devLink}
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-2 h-9 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </Form>
  );
}
