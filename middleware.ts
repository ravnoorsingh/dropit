import {
  clerkMiddleware,
  createRouteMatcher,
  auth,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/*
clerkMiddleware:
A higher-order function from Clerk that wraps your middleware logic, giving you access to Clerk’s authentication/session context for each request.
createRouteMatcher:
Utility to create a function that checks if a given request matches specific route patterns (e.g., public routes like /, /sign-in, /sign-up).
auth:
Clerk’s server-side authentication helper. When called, it returns a promise that resolves to the current user’s authentication state (session info, userId, etc.).
NextResponse:
Next.js API for manipulating HTTP responses in middleware (redirect, rewrite, etc.).
*/

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

/*
Purpose:
Defines which routes are considered “public” (accessible without authentication).
How it works:
createRouteMatcher returns a function (isPublicRoute) that takes a request and returns true if the request’s pathname matches any of the patterns.
Patterns:
/ (homepage)
/sign-in and any subpaths (e.g., /sign-in/reset)
/sign-up and any subpaths

*/


export default clerkMiddleware(async (auth, request) => {
  /*
Wraps your function, injecting Clerk’s context and helpers.
Receives two arguments:
auth: Clerk’s authentication helper (for this request).
request: The incoming HTTP request.
*/

  const user = auth();
  const userId = (await user).userId;
  /*
  auth():
Returns a promise resolving to the current user’s authentication/session object.
userId:
If the user is signed in, this is their unique Clerk user ID; otherwise, it’s undefined.
  */

  const url = new URL(request.url);
  // Parses the request URL for easy access to pathname, query, etc.

  if (userId && isPublicRoute(request) && url.pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  /*
  Purpose:
Prevents signed-in users from accessing /sign-in or /sign-up pages.
How:
If the user is authenticated (userId exists)
And the route is public (e.g., /sign-in, /sign-up)
And it’s not the homepage (/)
Then redirect them to /dashboard (the main app area for logged-in users).
   */

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
/*
Purpose:
Ensures only authenticated users can access private routes.
How:
If the route is not public, call auth.protect().
auth.protect() checks if the user is authenticated:
If not, it automatically redirects to the sign-in page or returns a 401 for API routes.
If authenticated, the request continues.
*/

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
/*
Purpose:
Tells Next.js which routes should run this middleware.
How:
The first pattern matches all routes except:
Next.js internals (_next)
Static files (images, CSS, JS, fonts, etc.)
The second pattern ensures all API routes (/api/*, /trpc/*) are always checked.

*/

/*
 Behind the Scenes & Project Integration
How does this fit into the project?
Authentication/Authorization:
This middleware is the gatekeeper for your app. It ensures:
Only unauthenticated users can access sign-in/sign-up pages.
Only authenticated users can access private pages (e.g., /dashboard, file management, etc.).
User Experience:
Seamless redirects: Authenticated users are sent to their dashboard, not back to login.
Unauthenticated users are redirected to sign-in if they try to access protected content.
Security:
Prevents unauthorized access to user data and private routes.
Ensures session tokens are checked on every request.
How does it work with other files?
With Clerk:
Uses Clerk’s server-side helpers for authentication and session management.
Relies on ClerkProvider in app/layout.tsx to provide context to the React app.
With Routing:
Works with Next.js’s file-based routing.
Public/private route logic is centralized here, not scattered across pages.
With API Routes:
Ensures API endpoints are protected (e.g., file upload, user data).
With the Database:
Only authenticated users can access or modify their files/folders (enforced by this middleware before any DB logic runs).
*/