import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
eq, and, isNull from drizzle-orm:

Helpers for building SQL WHERE conditions in a type-safe way.
*/

export async function GET(request: NextRequest) {
  try {
    // Check authentication
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
Only authenticated users should be able to fetch files.
    */

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryUserId = searchParams.get("userId");
    const parentId = searchParams.get("parentId");
    /*
    Purpose:
Extracts userId and parentId from the URL query parameters.
userId: The ID of the user whose files are being requested.
parentId: The folder ID to fetch files from (optional; if not provided, fetches root-level files).
    */

    // Verify the user is requesting their own files
    if (!queryUserId || queryUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    /*
    Purpose:
Ensures the user is only requesting their own files.
Prevents a user from accessing another user’s files by changing the userId in the query.
    */

    // Fetch files from database based on parentId
    let userFiles;
    if (parentId) {
      // Fetch files within a specific folder
      userFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.parentId, parentId)));
    } else {
      // Fetch root-level files (where parentId is null)
      userFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, userId), isNull(files.parentId)));
    }
    /*
    If parentId is provided:
Fetches all files/folders inside the specified folder for the user.
Uses Drizzle ORM’s and, eq to build a SQL query:
files.userId = userId
files.parentId = parentId
If parentId is not provided:
Fetches all root-level files/folders (those not inside any folder) for the user.
Uses isNull(files.parentId) to find items at the root.
    */

    return NextResponse.json(userFiles);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

/*
File/Folder Fetch Flow
Frontend:

When a user navigates to a folder or their root directory, the frontend sends a GET request to /api/files?userId=...&parentId=....
The frontend uses the returned JSON to display the user’s files and folders.
API Route (/api/files):

Authenticates the user (using Clerk).
Validates the request and user ownership.
Fetches the appropriate files/folders from the database.
Database:

The files/folders are stored in the files table, defined in lib/db/schema.ts.
The schema supports hierarchical folders, file metadata, ownership, and more.
Security
Double authentication:
The middleware.ts ensures only authenticated users can access API routes.
The API handler itself also checks authentication and user ownership for defense-in-depth.
User isolation:
Users can only fetch their own files/folders.
Integration with Other Files
middleware.ts:
Protects all API routes, including /api/files, ensuring only authenticated users can reach this handler.
lib/db/schema.ts:
Defines the structure of the files table, including fields like name, path, userId, parentId, isFolder, etc.
Supports hierarchical relationships for folders and files.
lib/db/index.ts (not shown, but implied):
Exports the db client used for all database operations.
Frontend components:
Use this API to display the user’s files/folders, support navigation, and build the file explorer UI.
*/