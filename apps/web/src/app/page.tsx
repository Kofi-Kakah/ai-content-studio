import Link from "next/link";
import type { Metadata } from "next";
import {
  SparklesIcon,
  FileTextIcon,
  Share2Icon,
  VideoIcon,
  SearchIcon,
  HeadingIcon,
  AlignLeftIcon,
  BarChart3Icon,
  CommandIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
  title: "AI Content Studio — Create anything, faster",
};

const features = [
  {
    icon: FileTextIcon,
    title: "Long-form articles",
    description: "Structured, SEO-ready blog posts with hooks that actually land.",
  },
  {
    icon: Share2Icon,
    title: "Social posts",
    description: "Platform-tuned variations for X, LinkedIn and Instagram.",
  },
  {
    icon: VideoIcon,
    title: "YouTube scripts",
    description: "Hook-first scripts with timestamps, b-roll notes and CTAs.",
  },
  {
    icon: AlignLeftIcon,
    title: "Summaries",
    description: "TL;DRs and key points from anything you paste in.",
  },
  {
    icon: HeadingIcon,
    title: "Titles",
    description: "Ten headline options, ranked, with the reasoning why.",
  },
  {
    icon: SearchIcon,
    title: "SEO descriptions",
    description: "Meta descriptions and keywords that rank and convert.",
  },
];

const productPoints = [
  {
    icon: SparklesIcon,
    title: "A workspace that feels like ChatGPT",
    description:
      "Streaming responses, conversation history, regenerate, one-click copy and Markdown export.",
  },
  {
    icon: BarChart3Icon,
    title: "Usage analytics built in",
    description:
      "Token usage, generations over time and per-format breakdowns on a live dashboard.",
  },
  {
    icon: CommandIcon,
    title: "Built for flow",
    description:
      "Command palette (⌘K), keyboard shortcuts, projects, infinite scroll and instant search.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SparklesIcon className="size-3.5" />
            </span>
            AI Content Studio
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="hidden sm:inline-flex" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button render={<Link href="/register" />}>Get started</Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 text-center sm:pt-28">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <SparklesIcon className="size-3" />
            Powered by DeepSeek v4.1 Flash on NVIDIA NIM
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Create anything,
            <br />
            <span className="text-muted-foreground">faster than ever.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground sm:text-lg">
            Articles, social posts, YouTube scripts, summaries, titles and SEO descriptions —
            one workspace, streaming AI, zero friction.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-11 px-6" render={<Link href="/register" />}>
              Start creating free
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6" render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
              Every format you need
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-4.5" />
                  </div>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product points */}
        <section className="py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:grid-cols-3">
            {productPoints.map((p) => (
              <div key={p.title} className="flex flex-col gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <p.icon className="size-4.5" />
                </div>
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/30 py-16 text-center">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Ready when you are</h2>
            <p className="mt-2 text-muted-foreground">
              Join the studio and ship your next hundred pieces of content.
            </p>
            <Button size="lg" className="mt-6 h-11 px-6" render={<Link href="/register" />}>
              Create your account
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>© 2026 AI Content Studio</span>
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="size-3.5" />
            Built with Next.js, Node, Prisma & NVIDIA AI
          </span>
        </div>
      </footer>
    </div>
  );
}
