"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ActivityIcon,
  CoinsIcon,
  FolderIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import {
  formatNumber,
  type UsageDay,
} from "@studio/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModeIcon } from "@/components/mode-icon";
import { useStatsOverview, useStatsUsage, useActivity } from "@/lib/queries";
import { timeAgo } from "@/components/layout/notifications";
import { getMode } from "@studio/shared";

export default function DashboardPage() {
  const [days, setDays] = React.useState<7 | 30 | 90>(30);

  const { data: overview, isLoading } = useStatsOverview();
  const { data: usage } = useStatsUsage(days);
  const { data: activity } = useActivity();

  return (
    <div className="scrollbar h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your usage and recent activity at a glance.
            </p>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 30 | 90)}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stat cards */}
        {isLoading || !overview ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<SparklesIcon className="size-4" />}
              label="Generations"
              value={formatNumber(overview.totals.generations)}
              sub={`${overview.today.generations} today`}
            />
            <StatCard
              icon={<MessageSquareIcon className="size-4" />}
              label="Conversations"
              value={formatNumber(overview.totals.conversations)}
              sub={`member since ${new Date(overview.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
            />
            <StatCard
              icon={<FolderIcon className="size-4" />}
              label="Projects"
              value={formatNumber(overview.totals.projects)}
              sub="organized content"
            />
            <StatCard
              icon={<CoinsIcon className="size-4" />}
              label="Tokens used"
              value={formatNumber(overview.totals.totalTokens)}
              sub={`${formatNumber(overview.last7Days.totalTokens)} in the last 7 days`}
            />
          </div>
        )}

        {/* Charts */}
        <div className="mt-3 grid gap-3 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Token usage</CardTitle>
              <CardDescription>Prompt vs. completion tokens per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <UsageChart series={usage?.series ?? []} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Generations</CardTitle>
              <CardDescription>Per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <GenerationsChart series={usage?.series ?? []} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent + activity */}
        <div className="mt-3 grid gap-3 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent generations</CardTitle>
              <CardDescription>Your latest AI outputs</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1.5">
              {(overview?.recent ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nothing yet — start a chat in the workspace.
                </p>
              ) : (
                (overview?.recent ?? []).map((g) => (
                  <Link
                    key={g.id}
                    href={`/workspace/${g.conversationId}`}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ModeIcon name={getMode(g.mode).icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {g.conversationTitle}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {g.preview}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      <span className="block">{timeAgo(g.createdAt)}</span>
                      {g.totalTokens ? (
                        <span className="block">{formatNumber(g.totalTokens)} tok</span>
                      ) : null}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>What you&apos;ve been up to</CardDescription>
            </CardHeader>
            <CardContent>
              {(activity?.activities ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                <ol className="relative ml-2 border-l">
                  {(activity?.activities ?? []).slice(0, 10).map((a) => (
                    <li key={a.id} className="relative mb-4 ml-4 last:mb-0">
                      <span className="absolute top-1 -left-[25px] flex size-2 rounded-full bg-primary/60" />
                      <p className="text-sm">{a.title}</p>
                      {a.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">{a.description}</p>
                      ) : null}
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <ActivityIcon className="size-3" />
                        {timeAgo(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
            {icon}
          </span>
          <span className="text-[13px] font-medium">{label}</span>
        </div>
        <p className="mt-2.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------- charts ------------------------------- */

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function UsageChart({ series }: { series: UsageDay[] }) {
  const data = series.map((d) => ({
    date: dayLabel(d.date),
    Prompt: d.promptTokens,
    Completion: d.completionTokens,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gPrompt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.7} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gCompletion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.7} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={38}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <ChartTooltip content={<UsageTooltip />} />
        <Area
          type="monotone"
          dataKey="Prompt"
          stackId="tokens"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gPrompt)"
        />
        <Area
          type="monotone"
          dataKey="Completion"
          stackId="tokens"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#gCompletion)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function GenerationsChart({ series }: { series: UsageDay[] }) {
  const data = series.map((d) => ({ date: dayLabel(d.date), Generations: d.generations }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={24}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <ChartTooltip content={<GenerationsTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="Generations" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function UsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-foreground">{formatNumber(Number(p.value))}</span>
        </p>
      ))}
      <p className="mt-1 border-t pt-1 text-muted-foreground">
        Total: <span className="font-medium text-foreground">{formatNumber(total)}</span>
      </p>
    </div>
  );
}

function GenerationsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-muted-foreground">
        Generations:{" "}
        <span className="font-medium text-foreground">{formatNumber(Number(payload[0]?.value))}</span>
      </p>
    </div>
  );
}
