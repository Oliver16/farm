import { z } from "zod";
import { featureSchema, geometrySchema } from "./validation";

export const onboardingJoinSchema = z.object({
  invite_code: z.string().min(1, "Invite code is required")
});

export const onboardingCreateOrgSchema = z.object({
  org_name: z.string().min(1, "Organization name is required")
});

const onboardingFeatureSchema = featureSchema.extend({
  geometry: geometrySchema
});

export const onboardingCreateFarmSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1, "Farm name is required"),
  feature: onboardingFeatureSchema
});

export type OnboardingJoinPayload = z.infer<typeof onboardingJoinSchema>;
export type OnboardingCreateOrgPayload = z.infer<typeof onboardingCreateOrgSchema>;
export type OnboardingCreateFarmPayload = z.infer<typeof onboardingCreateFarmSchema>;
