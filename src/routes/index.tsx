import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Mail, NotebookPen, CalendarClock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  generateEmail,
  planTasks,
  summarizeMeeting,
  type EmailDraft,
  type MeetingSummary,
  type TaskPlan,
} from "@/lib/suite.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadence — AI Productivity Suite" },
      {
        name: "description",
        content:
          "Draft tone-matched emails, turn raw meeting notes into decisions and action items, and time-box your day with an AI planner.",
      },
      { property: "og:title", content: "Cadence — AI Productivity Suite" },
      {
        property: "og:description",
        content:
          "Three AI workspaces: smart email generator, meeting notes summarizer, and Eisenhower task planner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error:\s*/, "") || "Something went wrong. Please try again.";
}

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {errorMessage(error)}
    </p>
  );
}

function OutputShell({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full border-border/70 bg-card">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground">
            Results appear here once you run the tool.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- module 1 -------------------------------- */

function EmailTool() {
  const fn = useServerFn(generateEmail);
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("Client");
  const [tone, setTone] = useState("Formal");

  const mutation = useMutation<EmailDraft>({
    mutationFn: () =>
      fn({ data: { context, audience, tone } }) as unknown as Promise<EmailDraft>,
  });
  const draft = mutation.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Compose brief</CardTitle>
          <CardDescription>
            The greeting, vocabulary, urgency and sign-off adapt to the audience and tone you pick.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-context">Context or topic</Label>
            <Textarea
              id="email-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Follow up on the delayed Q3 delivery, offer a revised timeline and ask for a call on Thursday."
              className="min-h-40"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Client", "Manager", "Team"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Formal", "Informal", "Persuasive"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ErrorNote error={mutation.error} />
          <Button
            onClick={() => mutation.mutate()}
            disabled={!context.trim() || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Drafting…
              </>
            ) : (
              <>
                <Sparkles /> Generate email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <OutputShell title="Generated draft" empty={!draft}>
        {draft ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Subject</p>
              <p className="mt-1 font-medium">{draft.subject_line}</p>
            </div>
            <Separator />
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {`${draft.greeting}\n\n${draft.body}\n\n${draft.sign_off}`}
            </div>
            <Separator />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Key highlights
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {draft.key_highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                navigator.clipboard?.writeText(
                  `${draft.subject_line}\n\n${draft.greeting}\n\n${draft.body}\n\n${draft.sign_off}`,
                )
              }
            >
              Copy email
            </Button>
          </div>
        ) : null}
      </OutputShell>
    </div>
  );
}

/* --------------------------------- module 2 -------------------------------- */

function MeetingTool() {
  const fn = useServerFn(summarizeMeeting);
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  const mutation = useMutation<MeetingSummary>({
    mutationFn: () =>
      fn({
        data: { notes, meetingDate: meetingDate || null },
      }) as unknown as Promise<MeetingSummary>,
  });
  const result = mutation.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Raw notes</CardTitle>
          <CardDescription>
            Paste a transcript or messy notes — deadlines are normalised to YYYY-MM-DD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-date">Meeting date (helps resolve “next Friday”)</Label>
            <Input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-notes">Transcript or notes</Label>
            <Textarea
              id="meeting-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sarah: we agreed to ship the beta before month end. Tom will fix onboarding by next Friday…"
              className="min-h-64"
            />
          </div>
          <ErrorNote error={mutation.error} />
          <Button
            onClick={() => mutation.mutate()}
            disabled={!notes.trim() || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Summarising…
              </>
            ) : (
              <>
                <Sparkles /> Summarise meeting
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <OutputShell title="Structured minutes" empty={!result}>
        {result ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Executive summary
              </p>
              <p className="mt-2 text-sm leading-relaxed">{result.executive_summary}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Key decisions
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {result.key_decisions.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Action matrix
              </p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.action_matrix.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="align-top">{row.task_description}</TableCell>
                        <TableCell className="align-top">
                          <div className="font-medium">{row.assignee}</div>
                          <Badge variant="secondary" className="mt-1 font-normal">
                            {row.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top whitespace-nowrap font-mono text-xs">
                          {row.deadline}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </OutputShell>
    </div>
  );
}

/* --------------------------------- module 3 -------------------------------- */

const QUADRANTS: Array<{ key: keyof TaskPlan["eisenhower"]; label: string; note: string }> = [
  { key: "do_first", label: "Do first", note: "Urgent + important" },
  { key: "schedule", label: "Schedule", note: "Important, not urgent" },
  { key: "delegate", label: "Delegate", note: "Urgent, not important" },
  { key: "eliminate", label: "Eliminate", note: "Neither" },
];

function PlannerTool() {
  const fn = useServerFn(planTasks);
  const [tasks, setTasks] = useState("");
  const [workdayStart, setWorkdayStart] = useState("09:00");
  const [workdayEnd, setWorkdayEnd] = useState("17:30");
  const [energyPreference, setEnergyPreference] = useState("Morning peak");

  const mutation = useMutation<TaskPlan>({
    mutationFn: () =>
      fn({
        data: { tasks, workdayStart, workdayEnd, energyPreference },
      }) as unknown as Promise<TaskPlan>,
  });
  const plan = mutation.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Task dump</CardTitle>
          <CardDescription>
            One task per line, with rough duration and any hard deadline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tasks">Tasks</Label>
            <Textarea
              id="tasks"
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder={"Finish investor deck – 2h – due today\nReply to support backlog – 45m\nDraft hiring plan – 1h"}
              className="min-h-52"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Day starts</Label>
              <Input
                id="start"
                type="time"
                value={workdayStart}
                onChange={(e) => setWorkdayStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Day ends</Label>
              <Input
                id="end"
                type="time"
                value={workdayEnd}
                onChange={(e) => setWorkdayEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Energy peak</Label>
            <Select value={energyPreference} onValueChange={setEnergyPreference}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Morning peak", "Afternoon peak", "Evening peak", "Steady"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ErrorNote error={mutation.error} />
          <Button
            onClick={() => mutation.mutate()}
            disabled={!tasks.trim() || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Planning…
              </>
            ) : (
              <>
                <Sparkles /> Build my day
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <OutputShell title="Priorities & schedule" empty={!plan}>
        {plan ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {QUADRANTS.map((q) => (
                <div key={q.key} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm font-semibold">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{q.note}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {plan.eisenhower[q.key].length ? (
                      plan.eisenhower[q.key].map((t, i) => <li key={i}>• {t}</li>)
                    ) : (
                      <li className="text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Time-boxed schedule
              </p>
              <ul className="mt-2 space-y-2">
                {plan.time_boxed_schedule.map((block, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <span className="font-mono text-xs text-primary">{block.time_block}</span>
                    <span className="text-sm font-medium">{block.assigned_activity}</span>
                    <Badge variant="outline" className="ml-auto font-normal">
                      {block.optimization_strategy}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            {plan.planning_notes ? (
              <p className="text-sm text-muted-foreground">{plan.planning_notes}</p>
            ) : null}
          </div>
        ) : null}
      </OutputShell>
    </div>
  );
}

/* ----------------------------------- page ---------------------------------- */

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            AI productivity suite
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Cadence</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Three focused workspaces that turn rough input into structured output: tone-matched
            emails, decision-ready meeting minutes, and a time-boxed day plan.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <Tabs defaultValue="email" className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-secondary p-1">
            <TabsTrigger value="email" className="gap-2 px-4 py-2">
              <Mail className="size-4" /> Email generator
            </TabsTrigger>
            <TabsTrigger value="meeting" className="gap-2 px-4 py-2">
              <NotebookPen className="size-4" /> Meeting summarizer
            </TabsTrigger>
            <TabsTrigger value="planner" className="gap-2 px-4 py-2">
              <CalendarClock className="size-4" /> Task planner
            </TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <EmailTool />
          </TabsContent>
          <TabsContent value="meeting">
            <MeetingTool />
          </TabsContent>
          <TabsContent value="planner">
            <PlannerTool />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
