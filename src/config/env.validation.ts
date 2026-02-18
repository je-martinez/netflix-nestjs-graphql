import { z } from 'zod';

export const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    DATABASE_URL_REPLICA_1: z.string().url(),
    DATABASE_URL_REPLICA_2: z.string().url(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Config validation error: ${result.error.message}`);
    }
    return result.data;
}
