import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "eagle_session";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (!hasSession && (path === "/app" || path.startsWith("/app/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSession && (path === "/login" || path === "/register")) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*", "/login", "/register"],
};
