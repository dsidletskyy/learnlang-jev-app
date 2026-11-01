# Choose authentication approach

Type: grilling
Status: resolved
Blocked by: 01

## Question

Which authentication library or service should the local-only app use for email/password accounts, verification, reset, and sessions, given the research and existing stack?

## Answer

Use Better Auth for email/password accounts, verification, password reset, and sessions. It offers an integrated lifecycle and a PostgreSQL Drizzle adapter, avoiding the extra service operations of self-hosted Supabase and the greater application-owned lifecycle work of Auth.js Credentials or custom authentication. Validate compatibility with the project's Next.js 16 and Drizzle versions during implementation. Security settings, authorization, email delivery, and migration details remain separate decisions; library defaults are not accepted implicitly.
