import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("8080"),
  FIREBASE_PROJECT_ID: z.string().min(1, "Missing FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: z.string().email("Invalid FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "Missing FIREBASE_PRIVATE_KEY")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment validation failed:");
  parsed.error.errors.forEach(err => {
    console.error(`   - ${err.path.join(".")}: ${err.message}`);
  });
  throw new Error(`Invalid environment variables`);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT)
};

console.log("✅ Environment loaded successfully");
console.log(`   PORT: ${env.PORT}`);
console.log(`   PROJECT_ID: ${env.FIREBASE_PROJECT_ID}`);
