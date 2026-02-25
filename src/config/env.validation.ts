import { z } from 'zod';

export const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    SECRET_DATABASE_URL: z.string().url(),
    SECRET_DATABASE_URL_REPLICA_1: z.string().url(),
    SECRET_DATABASE_URL_REPLICA_2: z.string().url(),
    ENV: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Config validation error: ${result.error.message}`);
    }
    return result.data;
}
