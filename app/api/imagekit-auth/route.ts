import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import ImageKit from "imagekit"
/*
This is Clerk’s server-side authentication helper.
When called, it returns a promise that resolves to the current user’s authentication state (including userId, session info, etc.).
Used to check if the incoming API request is from an authenticated user.
NextResponse from next/server
Next.js’s API for creating HTTP responses in API routes and middleware.
Used to return JSON responses and set status codes.
ImageKit
The official ImageKit SDK for Node.js.
Used to interact with the ImageKit media management service (for file uploads, transformations, etc.).
*/

// Initialize ImageKit with your credentials
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});
/*
Purpose:
Creates an instance of the ImageKit client, configured with your credentials.
How it works:
Reads credentials from environment variables (.env.local), which are not hardcoded for security.
publicKey: Used for client-side uploads.
privateKey: Used for server-side authentication and secure operations.
urlEndpoint: The base URL for your ImageKit media library.
Behind the scenes:
The credentials are loaded at runtime from your environment, ensuring secrets are not exposed in your codebase.
This instance is used to generate authentication parameters for secure client-side uploads.
*/

export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    /*
    auth()
Calls Clerk’s authentication helper to get the current user’s session.
Returns an object with userId if the user is authenticated.
If not authenticated:
Returns a JSON response with a 401 Unauthorized status.
Why?
Only authenticated users should be able to get ImageKit upload credentials, preventing anonymous uploads.
    */

    // Get authentication parameters from ImageKit
    const authParams = imagekit.getAuthenticationParameters();

    /*
    ImageKit.getAuthenticationParameters(token?: string, expire?: number): {
    token: string;
    expire: number;
    signature: string;
}
In case you are looking to implement client-side file upload, you are going to need a token, expiry timestamp, and a valid signature for that upload. The SDK provides a simple method that you can use in your code to generate these authentication parameters for you.
    */
   /*
   getAuthenticationParameters()
Generates a signature, token, and expiry timestamp.
These are required for secure client-side uploads to ImageKit.
The client (browser) uses these parameters to authenticate upload requests directly to ImageKit, without exposing your private key.
Behind the scenes:
Uses your privateKey to generate a secure signature.
Ensures that only users who have authenticated with your app can upload files.
   */

    return NextResponse.json(authParams);
    /*
    Purpose:
Sends the generated authentication parameters back to the client as a JSON response.
Client usage:
The frontend uses these parameters to initialize ImageKit’s upload widget or SDK, enabling secure direct upload
    */

  } catch (error) {
    console.error("Error generating ImageKit auth params:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication parameters" },
      { status: 500 }
    );
  }
}

/*
How This Fits Into the Whole Project
Authentication Flow
Clerk Integration:
The entire app uses Clerk for authentication (see app/layout.tsx, which wraps the app in <ClerkProvider>).
The middleware.ts ensures only authenticated users can access protected routes and APIs.
This API route (/api/imagekit-auth) is protected both by the middleware and by the explicit auth() check in the handler.
File Upload Flow
Frontend:
When a user wants to upload a file, the frontend calls /api/imagekit-auth to get secure upload credentials.
Only authenticated users can get these credentials.
Backend:
This route generates and returns the credentials using your ImageKit private key (never exposed to the client).
ImageKit:
The client uses the credentials to upload files directly to ImageKit, bypassing your server for the actual file data.
This is secure and efficient, as large files don’t need to pass through your backend.
Security
Why double-check authentication?
Even though middleware.ts protects API routes, explicit checks in API handlers are a best practice for defense-in-depth.
Why use environment variables?
Keeps secrets out of your codebase and version control.
Credentials are loaded securely at runtime.
How It Works With Other Files
middleware.ts:
Ensures only authenticated users can access /api/imagekit-auth.
If a request is unauthenticated, it is blocked before reaching this handler.
app/layout.tsx:
Provides Clerk context to the entire app, enabling authentication checks everywhere.
Frontend Components:
Likely use a form or upload widget that fetches credentials from this API before uploading files.
Database Layer (schema.ts, etc.):
After a successful upload, the client or another API route may create a record in your database, associating the uploaded file with the user.
*/