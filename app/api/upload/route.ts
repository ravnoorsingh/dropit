import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
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
Defines the structure and types for file records in your database
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
Only authenticated users should be able to upload files
    */

    // Parse request body
    const body = await request.json();
    const { imagekit, userId: bodyUserId } = body;
    /*
    request.json():
Parses the incoming request body as JSON.
Expects the body to contain an imagekit object (with file info) and a userId (the uploader’s ID).
    */

    // Verify the user is uploading to their own account
    if (bodyUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    /*
    Purpose:
Ensures the user is only uploading files to their own account.
Prevents a user from spoofing another user’s ID in the request.
    */

    // Validate ImageKit response
    if (!imagekit || !imagekit.url) {
      return NextResponse.json(
        { error: "Invalid file upload data" },
        { status: 400 }
      );
    }
    /*
    Purpose:
Ensures the request contains valid file data from ImageKit.
imagekit.url is required (the URL of the uploaded file in ImageKit)
    */

    // Extract file information from ImageKit response
    const fileData = {
      name: imagekit.name || "Untitled",
      path: imagekit.filePath || `/droply/${userId}/${imagekit.name}`,
      size: imagekit.size || 0,
      type: imagekit.fileType || "image",
      fileUrl: imagekit.url,
      thumbnailUrl: imagekit.thumbnailUrl || null,
      userId: userId,
      parentId: null, // Root level by default
      isFolder: false,
      isStarred: false,
      isTrash: false,
    };
    /*
    Purpose:
Prepares a file record to insert into the database.
Uses data from the ImageKit upload response.
Sets sensible defaults for missing fields.
parentId: null means the file is at the root level (not inside a folder).
    */

    // Insert file record into database
    const [newFile] = await db.insert(files).values(fileData).returning();
    /*
    db.insert(files).values(fileData).returning():
Inserts the new file record into the files table.
Returns the inserted row (as an array, so [newFile] extracts the first/only result).
Behind the scenes:
Uses Drizzle ORM to generate and run a SQL INSERT statement.
The schema for the files table is defined in lib/db/schema.ts.
    */

    return NextResponse.json(newFile);
    /*
    Purpose:
Sends the newly created file record back to the client as a JSON response.
    */

  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json(
      { error: "Failed to save file information" },
      { status: 500 }
    );
  }
}

/* How This Works in the Whole Project
Upload Flow
Frontend:

User uploads a file using an upload widget (likely using ImageKit’s SDK).
The frontend first fetches upload credentials from /api/imagekit-auth.
The file is uploaded directly to ImageKit from the browser.
After upload, the frontend sends a POST request to /api/upload with the ImageKit file info and the user’s ID.
API Route (/api/upload):

Authenticates the user (using Clerk).
Validates the request and file data.
Inserts a new file record into the database, associating it with the user.
Database:

The file record is stored in the files table, defined in lib/db/schema.ts.
The schema supports hierarchical folders, file metadata, ownership, and more.
Security
Double authentication:
The middleware.ts ensures only authenticated users can access API routes.
The API handler itself also checks authentication and user ownership for defense-in-depth.
No direct file uploads to your server:
Files are uploaded directly from the client to ImageKit, keeping your server stateless and scalable.
Integration with Other Files
middleware.ts:
Protects all API routes, including /api/upload, ensuring only authenticated users can reach this handler.
app/api/imagekit-auth/route.ts:
Provides secure upload credentials for ImageKit, only to authenticated users.
lib/db/schema.ts:
Defines the structure of the files table, including fields like name, path, size, type, fileUrl, userId, etc.
lib/db/index.ts (not shown, but implied):
Exports the db client used for all database operations.
Frontend components:
Use this API to save file metadata after a successful upload to ImageKit.
Likely display files by querying the database for the user’s files.*/