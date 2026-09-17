import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateStructured, strictObject } from "./ai-gateway.server";

/* ---------------------------------- types --------------------------------- */

export type EmailDraft = {
  subject_line: string;
  greeting: string;
  body: string;
  sign_off: string;
  key_highlights: string[];
};

export type MeetingSummary = {
  executive_summary: string;
  key_decisions: string[];
  action_matrix: Array<{
    task_description: string;
    assignee: string;
    role: string;
    deadline: string;
  }>;
};

export type TaskPlan = {
  eisenhower: {
    do_first: string[];
    schedule: string[];
    delegate: string[];
    eliminate: string[];
  };
  time_boxed_schedule: Array<{
    time_block: string;
    assigned_activity: string;
    optimization_strategy: string;
  }>;
  planning_notes: string;
};

/* ------------------------------ email generator ---------------------------- */

const EmailInput = z.object({
  context: z.string().min(1).max(6000),
  audience: z.enum(["Client", "Manager", "Team"]),
  tone: z.enum(["Formal", "Informal", "Persuasive"]),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured<EmailDraft>({
      instructions: [
        "You are a professional business email writer producing json output.",
        "Adapt greeting format, vocabulary level, call-to-action urgency and closing style to the audience and tone matrix:",
        "- Client: respectful, outcome-focused, no internal jargon.",
        "- Manager: concise, status and impact first, clear asks.",
        "- Team: collaborative, direct, action oriented.",
        "- Formal: full titles, complete sentences, measured CTA.",
        "- Informal: first names, contractions, light CTA.",
        "- Persuasive: benefit-led framing, urgent but respectful CTA.",
        "Body must be plain text paragraphs separated by blank lines, excluding greeting and sign-off.",
        "Key highlights: 3-5 short bullets, each under 120 characters.",
      ].join("\n"),
      input: `Audience: ${data.audience}\nTone: ${data.tone}\nContext/topic:\n${data.context}`,
      schemaName: "email_draft",
      schema: strictObject({
        subject_line: { type: "string" },
        greeting: { type: "string" },
        body: { type: "string" },
        sign_off: { type: "string" },
        key_highlights: { type: "array", items: { type: "string" } },
      }),
    });
  });

/* --------------------------- meeting notes summarizer ---------------------- */

const MeetingInput = z.object({
  notes: z.string().min(1).max(20000),
  meetingDate: z.string().max(40).nullable(),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MeetingInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured<MeetingSummary>({
      instructions: [
        "You convert raw meeting transcripts or unstructured notes into structured minutes as json.",
        "Executive summary: 2-3 sentences, high level.",
        "Key decisions: only binding decisions actually agreed in the meeting.",
        "Action matrix: one row per action item with the specific task, the responsible person or team, their role tag (e.g. Engineering, Design, Sales, Unassigned), and the deadline.",
        "Deadlines must always use the YYYY-MM-DD format; resolve relative dates against the meeting date. If no date can be determined, use 'TBD'.",
        "Never invent decisions or owners that are not supported by the text; use 'Unassigned' when no owner is stated.",
      ].join("\n"),
      input: `Meeting date: ${data.meetingDate || "unknown"}\nRaw notes/transcript:\n${data.notes}`,
      schemaName: "meeting_summary",
      schema: strictObject({
        executive_summary: { type: "string" },
        key_decisions: { type: "array", items: { type: "string" } },
        action_matrix: {
          type: "array",
          items: strictObject({
            task_description: { type: "string" },
            assignee: { type: "string" },
            role: { type: "string" },
            deadline: { type: "string" },
          }),
        },
      }),
    });
  });

/* ------------------------------- task planner ------------------------------ */

const PlannerInput = z.object({
  tasks: z.string().min(1).max(10000),
  workdayStart: z.string().max(10),
  workdayEnd: z.string().max(10),
  energyPreference: z.enum(["Morning peak", "Afternoon peak", "Evening peak", "Steady"]),
});

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlannerInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured<TaskPlan>({
      instructions: [
        "You are a productivity planner returning json.",
        "First categorize every task with the Eisenhower Matrix: do_first (urgent+important), schedule (important, not urgent), delegate (urgent, not important), eliminate (neither).",
        "Then build a chronological time-boxed schedule inside the given workday window with no overlapping blocks.",
        "Place demanding deep work in the stated energy peak window, honour hard deadlines, respect stated durations, and insert buffer periods and short breaks between heavy blocks.",
        "Each block: time_block as 'HH:MM - HH:MM', assigned_activity, and optimization_strategy such as Deep Work, Pomodoro, Batching, Buffer Period or Break.",
        "planning_notes: 1-2 sentences on trade-offs or overflow work.",
      ].join("\n"),
      input: `Workday: ${data.workdayStart} to ${data.workdayEnd}\nEnergy preference: ${data.energyPreference}\nTasks, durations and deadlines:\n${data.tasks}`,
      schemaName: "task_plan",
      schema: strictObject({
        eisenhower: strictObject({
          do_first: { type: "array", items: { type: "string" } },
          schedule: { type: "array", items: { type: "string" } },
          delegate: { type: "array", items: { type: "string" } },
          eliminate: { type: "array", items: { type: "string" } },
        }),
        time_boxed_schedule: {
          type: "array",
          items: strictObject({
            time_block: { type: "string" },
            assigned_activity: { type: "string" },
            optimization_strategy: { type: "string" },
          }),
        },
        planning_notes: { type: "string" },
      }),
    });
  });
