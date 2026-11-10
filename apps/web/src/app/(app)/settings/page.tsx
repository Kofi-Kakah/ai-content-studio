"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  formatBytes,
  formatNumber,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@studio/shared";
import {
  CheckIcon,
  Loader2Icon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "@/components/ui/toast";
import {
  useChangePassword,
  useDeleteAccount,
  useSessionUser,
  useStatsOverview,
  useUpdateProfile,
  useUploads,
} from "@/lib/queries";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data } = useSessionUser();
  const user = data?.user ?? null;

  return (
    <div className="scrollbar h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Manage your profile, security and preferences.
        </p>

        {/* Profile card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How you appear in the studio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">
                  {(user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{user?.name ?? "Unnamed"}</p>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                {user?.createdAt ? (
                  <p className="text-xs text-muted-foreground/70">
                    Member since{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            <ProfileForm name={user?.name ?? ""} bio={user?.bio ?? ""} />
          </CardContent>
        </Card>

        {/* Security card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        {/* Appearance card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Light, dark or follow your system.</CardDescription>
          </CardHeader>
          <CardContent>
            <AppearancePicker />
          </CardContent>
        </Card>

        {/* Usage summary */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Lifetime totals for this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageSummary />
          </CardContent>
        </Card>

        {/* Files card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>Documents you&apos;ve attached to chats.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadsList />
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="mb-8 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account, chats and projects. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountButton email={session?.user?.email ?? user?.email ?? ""} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ profile ------------------------------ */

function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const update = useUpdateProfile();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name, bio },
    values: { name, bio },
  });

  const onSubmit = async (values: UpdateProfileInput) => {
    try {
      await update.mutateAsync(values);
      toast.add({ title: "Profile updated", type: "success" });
    } catch (err) {
      toast.add({ title: "Update failed", description: (err as Error).message, type: "error" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">
              Email changes aren&apos;t available yet.
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Bio <span className="text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="A line about you" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
            {update.isPending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            Save profile
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ------------------------------ password ------------------------------ */

function PasswordForm() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    try {
      await change.mutateAsync(values);
      form.reset();
      toast.add({ title: "Password changed", type: "success" });
    } catch (err) {
      toast.add({ title: "Change failed", description: (err as Error).message, type: "error" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Change password
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ----------------------------- appearance ----------------------------- */

function AppearancePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Light", icon: <SunIcon className="size-4" /> },
    { value: "dark", label: "Dark", icon: <MoonIcon className="size-4" /> },
    { value: "system", label: "System", icon: <MonitorIcon className="size-4" /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[13px] font-medium transition-all hover:bg-muted/50",
            mounted && theme === o.value && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- usage -------------------------------- */

function UsageSummary() {
  const { data } = useStatsOverview();
  const t = data?.totals;
  if (!t) return <SkeletonRow />;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        { label: "Generations", value: formatNumber(t.generations) },
        { label: "Conversations", value: formatNumber(t.conversations) },
        { label: "Projects", value: formatNumber(t.projects) },
        { label: "Tokens", value: formatNumber(t.totalTokens) },
      ].map((s) => (
        <div key={s.label} className="rounded-lg bg-muted/50 p-3">
          <p className="text-lg font-semibold tabular-nums">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

/* ------------------------------- files -------------------------------- */

function UploadsList() {
  const { data, isLoading } = useUploads();
  const files = data?.files ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No files uploaded yet — attach one in a chat with the paperclip.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(f.size)} · {new Date(f.createdAt).toLocaleDateString()}
            </p>
          </div>
          <a
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Open
          </a>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- danger zone ----------------------------- */

function DeleteAccountButton({ email }: { email: string }) {
  const del = useDeleteAccount();
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const onConfirm = async () => {
    try {
      await del.mutateAsync();
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      toast.add({ title: "Delete failed", description: (err as Error).message, type: "error" });
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2Icon />
        Delete account
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your profile, conversations, projects and files.
              Type <span className="font-mono font-medium">{email}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={email}
            aria-label="Confirm your email"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== email || del.isPending}
              onClick={() => void onConfirm()}
            >
              {del.isPending ? <Loader2Icon className="animate-spin" /> : null}
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
