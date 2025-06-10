/*
entty point -> Auth with clerk -> take input from user(folder name) -> Take userId  and match -> 
validation for folderName -> parentId ? (verification of the parentId, match the parentId, parentId should belong to the user, It should be a folder) -> Create the folderData -> insert into DB : if parentId is null then no further parent exist
*/

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
/*
NextRequest, NextResponse:

Next.js’s API for handling HTTP requests and responses in API routes.
NextRequest represents the incoming HTTP request.
NextResponse is used to send JSON responses, set status codes, etc.
auth from @clerk/nextjs/server:

Clerk’s server-side authentication helper.
Used to check if the incoming API request is from an authenticated user and to get the user’s ID.
db from @/lib/db:

The Drizzle ORM database client, configured for your Neon PostgreSQL database.
Used to run queries (insert, select, etc.) against your database.
files from @/lib/db/schema:

The Drizzle ORM table schema for your files/folders.
Defines the structure and types for file/folder records in your database.
uuidv4 from uuid:

Generates a unique identifier for each new folder.
eq, and from drizzle-orm:

Helpers for building SQL WHERE conditions in a type-safe way.
*/

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    /*
   auth():
Calls Clerk’s authentication helper to get the current user’s session.
Returns an object with userId if the user is authenticated.
If not authenticated:
Returns a JSON response with a 401 Unauthorized status.
Why?
Only authenticated users should be able to create folders. 
    */

    const body = await request.json();
    const { name, userId: bodyUserId, parentId = null } = body;
    /*
    request.json():
Parses the incoming request body as JSON.
Expects the body to contain a name (folder name), a userId (the creator’s ID), and optionally a parentId (for nested folders).

    */

    // Verify the user is creating a folder in their own account
    if (bodyUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    /*
    Purpose:
Ensures the user is only creating folders in their own account.
Prevents a user from spoofing another user’s ID in the request
    */

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Check if parent folder exists if parentId is provided
    if (parentId) {
      const [parentFolder] = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, parentId),
            eq(files.userId, userId),
            eq(files.isFolder, true)
          )
        );
        /*
        Purpose:
If a parentId is provided, checks that:
The parent folder exists.
The parent folder belongs to the user.
The parent is actually a folder (not a file).
Why?
Prevents users from nesting folders under files, or under folders they don’t own.
        */

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    // Create folder record in database
    const folderData = {
      id: uuidv4(),
      name: name.trim(),
      path: `/folders/${userId}/${uuidv4()}`,
      size: 0,
      type: "folder",
      fileUrl: "",
      thumbnailUrl: null,
      userId,
      parentId,
      isFolder: true,
      isStarred: false,
      isTrash: false,
    };
    /*
    Purpose:
Prepares a folder record to insert into the database.
Uses a new UUID for the folder’s ID and path.
Sets sensible defaults for fields like size, fileUrl, isFolder, etc.
    */

    const [newFolder] = await db.insert(files).values(folderData).returning();
    /*
    db.insert(files).values(folderData).returning():
Inserts the new folder record into the files table.
Returns the inserted row (as an array, so [newFolder] extracts the first/only result).
Behind the scenes:
Uses Drizzle ORM to generate and run a SQL INSERT statement.
The schema for the files table is defined in lib/db/schema.ts.
    */

    return NextResponse.json({
      success: true,
      message: "Folder created successfully",
      folder: newFolder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}

/*
How This Works in the Whole Project
Folder Creation Flow
Frontend:

User submits a form to create a folder (with a name and optional parent folder).
The frontend sends a POST request to /api/folders/create with the folder name, userId, and optional parentId.
API Route (/api/folders/create):

Authenticates the user (using Clerk).
Validates the request and folder data.
Checks parent folder validity if nesting.
Inserts a new folder record into the database, associating it with the user and (optionally) a parent folder.
Database:

The folder record is stored in the files table, defined in lib/db/schema.ts.
The schema supports hierarchical folders, file metadata, ownership, and more.
Security
Double authentication:
The middleware.ts ensures only authenticated users can access API routes.
The API handler itself also checks authentication and user ownership for defense-in-depth.
Parent folder validation:
Prevents users from creating folders in places they don’t own or under files.
Integration with Other Files
middleware.ts:
Protects all API routes, including /api/folders/create, ensuring only authenticated users can reach this handler.
lib/db/schema.ts:
Defines the structure of the files table, including fields like name, path, userId, parentId, isFolder, etc.
Supports hierarchical relationships for folders and files.
lib/db/index.ts (not shown, but implied):
Exports the db client used for all database operations.
Frontend components:
Use this API to create new folders and display the folder structure by querying the database for the user’s folders/files.
*/