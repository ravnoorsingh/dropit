/**
 * Database Schema for Droply
 *
 * This file defines the database structure for our Droply application.
 * We're using Drizzle ORM with PostgreSQL (via Neon) for our database.
 */

import { integer, pgTable, text, uuid, boolean, timestamp} from "drizzle-orm/pg-core";
import { relations} from "drizzle-orm";


/**
 * Files Table
 *
 * This table stores all files and folders in our Droply.
 * - Both files and folders are stored in the same table
 * - Folders are identified by the isFolder flag
 * - Files/folders can be nested using the parentId (creating a tree structure)
 */

// Create a table
// import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

// export const usersTable = pgTable("users", {
//   id: integer().primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar({ length: 255 }).notNull(),
//   age: integer().notNull(),
//   email: varchar({ length: 255 }).notNull().unique(),
// });

export const files = pgTable("files", { // name of this table will be files in DB
    // properties
    id: uuid("id").defaultRandom().primaryKey(),
    // defaultRandom(): for generating a random uuid, 
    // primaryKey(): for finding with the help oof id in the database

    // Basic file/folder information
    name: text("name").notNull(),
    path: text("path").notNull(), // Full path to the file/folder, /document/project/resume.pdf
    size: integer("size").notNull(), // Size in bytes (0 for folders)
    type: text("type").notNull(), // MIME type for files, "folder" for folders

    // Storage information
    fileUrl: text("file_url").notNull(), // URL to access the file
    thumbnailUrl: text("thumbnail_url"), // Optional thumbnail for images/documents

    // Ownership and hierarchy
    userId: text("user_id").notNull(), // Owner of the file/folder
    parentId: uuid("parent_id"), // Parent folder ID (null for root items)

    // File/folder flags
    isFolder: boolean("is_folder").default(false).notNull(), // Whether this is a folder
    isStarred: boolean("is_starred").default(false).notNull(), // Starred/favorite items
    isTrash: boolean("is_trash").default(false).notNull(), // Items in trash

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * File Relations
 *
 * This defines the relationships between records in our files table:
 * 1. parent - Each file/folder can have one parent folder
 * 2. children - Each folder can have many child files/folders
 *
 * This creates a hierarchical file structure similar to a real filesystem.
 */
export const filesRelations = relations(files, ({ one, many }) => ({
  // Relationship to parent folder
  parent: one(files, {
    fields: [files.parentId], // The foreign key in this table
    references: [files.id], // The primary key in the parent table
  }),

  // Relationship to child files/folders
  children: many(files), // we are defyning that there could be many files inside a folder
}));

/**
 * Type Definitions
 *
 * These types help with TypeScript integration:
 * - File: Type for retrieving file data from the database
 * - NewFile: Type for inserting new file data into the database
 */
export type File = typeof files.$inferSelect;
/*
Purpose:
This creates a TypeScript type called File that represents the shape of a row you get when you select (read) data from the files table.
How it works:
Drizzle ORM automatically infers the correct TypeScript type for a row in your table based on your schema.
files.$inferSelect is a special Drizzle property that gives you this inferred type.
Usage:
Use File when you are reading or querying files from the database.
*/

export type NewFile = typeof files.$inferInsert;

/*
Purpose:
This creates a TypeScript type called NewFile that represents the shape of data you need to insert into the files table.
How it works:
Drizzle ORM infers which fields are required/optional for inserting a new row (e.g., id might be optional if auto-generated).
files.$inferInsert gives you this type.
Usage:
Use NewFile when you are inserting new files/folders into the database.

*/

/*
The relations function in your schema is used to define relationships between records in the same table—specifically, to model the parent-child hierarchy of files and folders in your virtual filesystem.
export const filesRelations = relations(files, ({ one, many }) => ({
  // Relationship to parent folder
  parent: one(files, {
    fields: [files.parentId], // The foreign key in this table
    references: [files.id],   // The primary key in the parent table
  }),

  // Relationship to child files/folders
  children: many(files),
}));

Explanation:
parent: one(files, {...})

Purpose:
Defines that each file or folder can have one parent (another folder).
How:
The parentId field in a file/folder row points to the id of another row in the same table.
This is a self-referencing foreign key.
Result:
You can easily query the parent folder of any file/folder.
children: many(files)

Purpose:
Defines that each folder can have many children (files or folders).
How:
Any row whose parentId matches this folder’s id is considered a child.
Result:
You can easily query all files/folders inside a given folder.
Why is this useful?
Hierarchical Structure:
Enables you to build a tree-like structure (folders within folders, files within folders), just like a real filesystem.
Efficient Queries:
You can fetch all children of a folder, or find the parent of any file/folder, using Drizzle ORM’s relational queries.
Type Safety:
TypeScript will know about these relationships, making your code safer and easier to autocomplete.
In summary:
The relations definition allows your app to:

Traverse up (find parent) and down (find children) the file/folder hierarchy.
Model a real filesystem in your database.
Write clear, type-safe queries for parent/child relationships using Drizzle ORM.


 */