CREATE TABLE "auth_identifier_rate_limit" (
  "operation" text NOT NULL,
  "identifier_hash" text NOT NULL,
  "attempts" timestamp with time zone[] NOT NULL,
  PRIMARY KEY ("operation", "identifier_hash")
);
