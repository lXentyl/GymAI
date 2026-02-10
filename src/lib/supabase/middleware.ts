import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Guard: if Supabase is not configured, skip auth checks entirely
    if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes("placeholder") ||
        supabaseAnonKey.includes("placeholder")
    ) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        });

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Public routes that don't require auth
        const publicPaths = ["/login", "/register", "/auth/callback"];
        const isPublicPath = publicPaths.some((path) =>
            request.nextUrl.pathname.startsWith(path)
        );

        if (!user && !isPublicPath) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }

        // If user is logged in and hits auth pages, redirect to dashboard
        if (
            user &&
            (request.nextUrl.pathname === "/login" ||
                request.nextUrl.pathname === "/register")
        ) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }
    } catch {
        // If Supabase client fails for any reason, let the request through
        return NextResponse.next({ request });
    }

    return supabaseResponse;
}
