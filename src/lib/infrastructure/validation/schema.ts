import { z } from 'zod';

export const NodeSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    effortHours: z.number().positive(),
    start: z.string().optional(),
    end: z.string().optional(),
    groupId: z.string().nullable().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional()
});

export const EdgeSchema = z.object({ id: z.string(), source: z.string(), target: z.string() });
export const GroupSchema = z.object({ id: z.string(), name: z.string(), nodeIds: z.array(z.string()) });

export const ProjectSettingsSchema = z.object({
    name: z.string(),
    dueDate: z.string(),
    projectBufferDays: z.number().nonnegative(),
    useFiftyPctEstimate: z.boolean(),
    shrinkRatio: z.number().positive(),
    hoursPerDay: z.number().positive()
});

export const SnapshotSchema = z.object({
    project: ProjectSettingsSchema,
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
    groups: z.array(GroupSchema)
});