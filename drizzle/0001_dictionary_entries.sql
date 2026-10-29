CREATE TABLE "dictionary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"original" text NOT NULL,
	"language" text NOT NULL,
	"translation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
