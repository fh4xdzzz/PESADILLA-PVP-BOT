import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("pesadilla_session");
  response.cookies.delete("oauth_state");
  return response;
}
