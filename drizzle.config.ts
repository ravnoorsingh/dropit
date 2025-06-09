/**
 * Drizzle Configuration
 *
 * This file configures Drizzle ORM to work with our Neon PostgreSQL database.
 * It's used by the Drizzle CLI for schema migrations and generating SQL.
 */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local  // as using localized version
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Configure migrations table
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
  // Additional options
  verbose: true,
  strict: true,
  
});

/*
schema: Points to your TypeScript schema file.
out: Directory for generated migration files.
dialect: Specifies PostgreSQL.
dbCredentials: Uses your environment variable for DB connection.
migrations: Configures where migration history is tracked.
verbose/strict: Enables detailed logs and strict checks.
4. How Do These Files Work Together?
Development & Migration Workflow
Define/Update Schema

You edit schema.ts to add or change tables, columns, or relationships.
Generate Migrations

Run Drizzle CLI commands (using drizzle.config.ts for config).
Drizzle reads your schema, compares it to the current DB, and generates SQL migration scripts in the ./drizzle folder.
Apply Migrations

Drizzle CLI applies migrations to your Neon PostgreSQL database.
Migration history is tracked in the __drizzle_migrations table.
App Runtime

index.ts initializes the Drizzle ORM client using your schema and Neon connection.
Your app imports and uses db for all database operations, with full type safety and autocompletion.
Behind the Scenes
Type Safety:
All queries and inserts are checked at compile time against your schema.
Hierarchical Data:
The parent/child relations in schema.ts allow you to easily fetch folder contents, build breadcrumbs, or move files/folders.
Serverless Ready:
Uses Neon’s HTTP driver, making it ideal for serverless/edge deployments (like Vercel).
Environment Management:
Credentials and config are kept out of code, loaded from .env.local.
*/

/*
Great question! While both index.ts and drizzle.config.ts are related to your database and Drizzle ORM, they serve very different purposes and are used in different contexts:

1. drizzle.config.ts — CLI/Build-Time Configuration
Purpose
Used by the Drizzle CLI (command-line interface) for:
Generating and running database migrations
Inferring schema changes
Generating SQL scripts
NOT used at runtime by your application code.
How it works
Loads environment variables (like DATABASE_URL) for CLI access.
Tells Drizzle CLI:
Where your schema file is (schema)
Where to output migration files (out)
What database dialect to use (dialect)
How to connect to the database (dbCredentials)
Where to store migration history (migrations)
Example usage:
When you run drizzle-kit generate or drizzle-kit migrate, the CLI reads this file to know how to connect and what to do.
Summary
Build-time/CLI only
Not imported or run by your app code
No queries or runtime logic here
2. index.ts — Runtime Database Client
Purpose
Used by your application code at runtime (API routes, server components, etc.) to:
Connect to the database
Run queries (CRUD operations)
Use the Drizzle ORM client (db)
Optionally run raw SQL queries (sql)
How it works
Imports your schema for type safety.
Uses the Neon driver and Drizzle ORM to create a live database client.
Exports:
db — the Drizzle ORM client for type-safe queries
sql — the raw SQL client for advanced queries
Summary
Runtime only
Imported and used by your app/server code
Handles actual data fetching, inserting, updating, etc.
How They Work Together
drizzle.config.ts is for schema management and migrations (setup, not used in app code).
index.ts is for actual database operations in your running app (used in API routes, server actions, etc.).
Analogy
drizzle.config.ts is like the blueprint and toolbox for building your house (used by the builders before you move in).
index.ts is like the keys and controls you use to live in and interact with your house every day.
In summary:

drizzle.config.ts is for the CLI and migrations (build/setup time).
index.ts is for your app’s runtime database access (actual queries and data operations).
They are both essential, but for different stages of your project’s lifecycle.
*/
