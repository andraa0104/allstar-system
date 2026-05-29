import fs from "fs";
import path from "path";
import { z } from "zod";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const permissionsSchema = z.object({
  kd_user: z.string().min(1),
  permissions: z.record(z.string(), z.record(z.string(), z.boolean())),
});

interface PrivilegeEntry {
  kd_user: string;
  updated_at: string;
  permissions: Record<string, Record<string, boolean>>;
}

function getFilePath() {
  const filePath = path.join(process.cwd(), "../public/data/user_privileges.json");
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return filePath;
}

function loadAllPrivileges(): PrivilegeEntry[] {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as PrivilegeEntry[];
  } catch (error) {
    console.error("Gagal membaca user_privileges.json:", error);
    return [];
  }
}

function saveAllPrivileges(entries: PrivilegeEntry[]) {
  const filePath = getFilePath();
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kd_user = url.searchParams.get("kd_user");

    if (!kd_user) {
      // If no user is specified, return all entries
      const allEntries = loadAllPrivileges();
      return jsonResponse(allEntries, {}, request);
    }

    const allEntries = loadAllPrivileges();
    const entry = allEntries.find((e) => e.kd_user === kd_user);

    if (!entry) {
      // Return empty default matrix if not found
      const defaultMatrix: Record<string, Record<string, boolean>> = {
        "Dashboard": { V: false, C: false, U: false, D: false },
        "Order Control": { V: false, C: false, U: false, D: false },
        "Order Job": { V: false, C: false, U: false, D: false },
        "System Settings": { V: false, C: false, U: false, D: false },
      };
      return jsonResponse({ kd_user, permissions: defaultMatrix }, {}, request);
    }

    return jsonResponse(entry, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = permissionsSchema.parse(await request.json());
    const allEntries = loadAllPrivileges();

    const existingIndex = allEntries.findIndex((e) => e.kd_user === payload.kd_user);
    const updatedEntry: PrivilegeEntry = {
      kd_user: payload.kd_user,
      updated_at: new Date().toISOString(),
      permissions: payload.permissions,
    };

    if (existingIndex > -1) {
      allEntries[existingIndex] = updatedEntry;
    } else {
      allEntries.push(updatedEntry);
    }

    saveAllPrivileges(allEntries);

    return jsonResponse(
      { message: "Privilege access berhasil diubah.", data: updatedEntry },
      {},
      request,
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
