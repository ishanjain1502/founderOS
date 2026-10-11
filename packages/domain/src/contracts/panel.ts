import { z } from "zod";
import { baseEntitySchema } from "./base";
import { panelPrimaryChoiceSchema } from "./enums";

const sessionScopedBaseSchema = baseEntitySchema.extend({
  sessionId: z.string().uuid(),
});

/** How a questionnaire item is answered (SP-06 §Questionnaire). */
export const panelQuestionResponseKindSchema = z.enum([
  "primary_choice",
  "main_objection",
  "text",
  "price_range",
]);

export type PanelQuestionResponseKind = z.infer<
  typeof panelQuestionResponseKindSchema
>;

export const panelQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    required: z.boolean().default(true),
    responseKind: panelQuestionResponseKindSchema,
    choices: z.array(panelPrimaryChoiceSchema).optional(),
  })
  .superRefine((question, ctx) => {
    if (question.responseKind === "primary_choice") {
      if (!question.choices || question.choices.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "primary_choice questions require choices",
          path: ["choices"],
        });
      }
    }
  });

export type PanelQuestion = z.infer<typeof panelQuestionSchema>;

/** Versioned panel questionnaire catalog (SP-02 §2.4, Q23). */
export const panelQuestionnaireSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  questions: z.array(panelQuestionSchema).min(1),
});

export type PanelQuestionnaire = z.infer<typeof panelQuestionnaireSchema>;

/**
 * Session-scoped stimulus shown to simulated respondents (SP-02 §2.4).
 * Panel runs reference this object; evaluations snapshot version + text.
 */
export const panelStimulusSchema = sessionScopedBaseSchema.extend({
  stimulusVersion: z.number().int().min(1),
  featureSummary: z.string().min(1),
  productSummary: z.string().min(1),
  questionnaireVersion: z.number().int().min(1),
});

export type PanelStimulus = z.infer<typeof panelStimulusSchema>;
