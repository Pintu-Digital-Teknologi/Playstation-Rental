import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Hanya jalankan logika CORS untuk route yang diawali dengan /api
  if (request.nextUrl.pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");

    // Daftar origin yang diperbolehkan
    const allowedOrigins = [
      "http://localhost:5173",
      "https://license-rental.vercel.app",
      "http://localhost:3000", // Tambahkan localhost backend juga untuk keamanan
    ];

    // Cek apakah origin ada di daftar yang diperbolehkan
    if (origin && allowedOrigins.includes(origin)) {
      // Handle preflight request (OPTIONS)
      if (request.method === "OPTIONS") {
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods":
              "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
            "Access-Control-Allow-Credentials": "true",
          },
        });
      }

      // Untuk request biasa (GET, POST, dll), lanjutkan request tapi tambahkan header CORS di response
      const response = NextResponse.next();
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");

      return response;
    }
  }

  // Jika bukan route API atau origin tidak allowed, lanjutkan seperti biasa
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
