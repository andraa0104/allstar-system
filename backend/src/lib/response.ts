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
  // Safari requires exact origin echo when accessed via IP address without domain/SSL
  const allowedOrigin = origin
    ? origin
    : (allowedOrigins[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store, no-cache, must-revalidate",
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
    const formattedErrors = error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    return jsonResponse(
      {
        message: `Validasi request gagal: ${formattedErrors}`,
        errors: error.issues,
        error: formattedErrors,
        details: JSON.stringify(error.issues, null, 2),
      },
      { status: 422 },
      request,
    );
  }

  if (error instanceof HttpError) {
    return jsonResponse({ message: error.message, details: error.message }, { status: error.status }, request);
  }

  console.error(error);

  const errObj = error as any;
  const sqlState = errObj?.sqlState || null;
  const code = errObj?.code || null;
  const sqlMessage = errObj?.sqlMessage || null;
  const errno = errObj?.errno || null;
  const isDev = process.env.NODE_ENV !== "production";
  const message = sqlMessage || errObj?.message || "Terjadi kesalahan server.";

  const detailsParts: string[] = [];
  if (code) detailsParts.push(`Code: ${code}`);
  if (errno) detailsParts.push(`Errno: ${errno}`);
  if (sqlState) detailsParts.push(`SQL State: ${sqlState}`);
  if (sqlMessage) detailsParts.push(`SQL Message: ${sqlMessage}`);
  if (errObj?.sql && isDev) detailsParts.push(`SQL: ${errObj.sql}`);
  if (errObj?.stack && isDev) detailsParts.push(`Stack: ${errObj.stack}`);

  return jsonResponse(
    {
      message,
      error: isDev ? (sqlMessage || errObj?.message || String(error)) : undefined,
      details: detailsParts.length > 0 ? detailsParts.join(" | ") : String(error),
      code,
      errno,
      sqlState,
      sqlMessage,
      sql: isDev ? errObj?.sql : undefined,
    },
    { status: 500 },
    request,
  );
}
