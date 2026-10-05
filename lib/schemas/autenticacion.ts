import { z } from "zod";

export const perfilGoogleSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.literal(true),
});
