import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Keeps the login session fresh on every page load.
export async function middleware(request: NextRequest) {
  // Pages can read where they are (sign-in sends you back there).
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-path", request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request: { headers: reqHeaders } });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        reqHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = NextResponse.next({ request: { headers: reqHeaders } });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|models/|favicon.ico).*)"],
};
