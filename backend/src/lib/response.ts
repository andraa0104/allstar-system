import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { allowedOrigins } from "@/lib/env";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function corsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
  request?: Request,
) {
  const origin = request?.headers.get("origin") ?? null;
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(origin),
      ...init.headers,
    },
  });
}

export function emptyResponse(init: ResponseInit = {}, request?: Request) {
  const origin = request?.headers.get("origin") ?? null;
  return new NextResponse(null, {
    ...init,
    headers: {
      ...corsHeaders(origin),
      ...init.headers,
    },
  });
}

export function errorResponse(error: unknown, request: Request) {
  if (error instanceof ZodError) {
    return jsonResponse(
      { message: "Validasi request gagal.", errors: error.issues },
      { status: 422 },
      request,
    );
  }

  if (error instanceof HttpError) {
    return jsonResponse({ message: error.message }, { status: error.status }, request);
  }

  console.error(error);
  return jsonResponse(
    { message: "Terjadi kesalahan server." },
    { status: 500 },
    request,
  );
}
