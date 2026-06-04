import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const res = await fetch("http://localhost:8011/status", {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`WhatsApp service responded with status ${res.status}`);
    }
    const data = await res.json();
    return jsonResponse(data, {}, request);
  } catch (error) {
    // If the service is not running, return disconnected status
    return jsonResponse({
      status: "disconnected",
      qr: null,
      error: "WhatsApp background service is not running."
    }, {}, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
