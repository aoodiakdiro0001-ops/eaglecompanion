import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(60, "الاسم طويل جداً"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("بريد إلكتروني غير صالح")
    .max(160),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 محارف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "اسم المساحة قصير").max(60, "اسم المساحة طويل"),
});

export const inviteSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.enum(["member", "viewer"]),
});

export const inviteCreateSchema = z.object({
  role: z.enum(["member", "viewer"]),
});

export const joinSchema = z.object({
  code: z.string().trim().min(4, "الكود غير صالح").max(32),
});

export const pairingCodeSchema = z.object({
  workspaceId: z.string().min(1),
});

export const agentPairSchema = z.object({
  code: z.string().trim().min(4, "الكود غير صالح").max(32),
  name: z.string().trim().min(1, "اسم الجهاز مطلوب").max(60),
  platform: z.string().max(80).optional(),
  userAgent: z.string().max(400).optional(),
  screenW: z.number().int().positive().max(20000).optional(),
  screenH: z.number().int().positive().max(20000).optional(),
});

export const heartbeatSchema = z.object({
  batteryLevel: z.number().int().min(0).max(100).nullable().optional(),
  charging: z.boolean().nullable().optional(),
  networkType: z.string().max(40).nullable().optional(),
  platform: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  screenW: z.number().int().positive().max(20000).optional(),
  screenH: z.number().int().positive().max(20000).optional(),
});

export const frameSchema = z.object({
  shareId: z.string().min(1),
  image: z.string().min(16).max(600_000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AgentPairInput = z.infer<typeof agentPairSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
