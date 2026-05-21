import { emptyResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse({ status: "ok", service: "allstar-system-backend" });
}

export async function OPTIONS() {
  return emptyResponse({ status: 204 });
}
