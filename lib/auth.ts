import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import {
  users, sessions, accounts, verifications,
} from "./db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  socialProviders: {
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      // LinkedIn v2 returns: name, given_name, family_name, email, picture, sub
    },
  },

  // Map better-auth's 'name' and 'image' fields to our column names.
  // Our users table uses 'name' (→ display name) and 'image' (→ avatar URL)
  // which already match better-auth's convention.
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      linkedinId: {
        type: "string",
        required: false,
      },
      timezone: {
        type: "string",
        required: false,
        defaultValue: "Asia/Kolkata",
      },
      personaLevel: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      streakFreezesRemaining: {
        type: "number",
        required: false,
        defaultValue: 1,
      },
      onboardingComplete: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      currentFocus: {
        type: "string",
        required: false,
      },
      collegeUrl: {
        type: "string",
        required: false,
      },
      college: {
        type: "string",
        required: false,
      },
    },
  },

  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
})
