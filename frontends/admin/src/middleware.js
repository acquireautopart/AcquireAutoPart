import { NextResponse } from "next/server";

function sendToApp(base, request) {
  if (!base) return new NextResponse("The destination frontend URL is not configured.", { status: 503 });
  const destination = new URL(request.nextUrl.pathname, base);
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination);
}

export function middleware(request) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/") || path.startsWith("/_next/") || /\.[^/]+$/.test(path)) return NextResponse.next();
  if (path === "/") return NextResponse.rewrite(new URL("/admin/overview", request.url));
  if (path === "/seller" || path.startsWith("/seller/")) return sendToApp(process.env.NEXT_PUBLIC_SELLER_URL, request);
  if (["/parts", "/product", "/category", "/cart", "/profile", "/address"].some((route) => path === route || path.startsWith(`${route}/`))) {
    return sendToApp(process.env.NEXT_PUBLIC_STORE_URL, request);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
