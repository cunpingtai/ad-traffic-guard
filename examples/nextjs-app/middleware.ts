import { NextResponse, type NextRequest } from "next/server";
import {
  ATG_KNOWN_CRAWLER_HEADER,
  isKnownCrawlerRequest
} from "@cunpingtai/ad-traffic-guard/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (isKnownCrawlerRequest(request.headers)) {
    response.headers.set(ATG_KNOWN_CRAWLER_HEADER, "1");
    response.cookies.set("atg-known-crawler", "1", {
      path: "/",
      maxAge: 60 * 60,
      sameSite: "lax"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
