import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const permissionsSchema = z.record(z.string(), z.record(z.string(), z.boolean()));

type PermissionRow = RowDataPacket & {
  module: string;
  role: string;
  allowed: number;
};

export async function GET(request: Request) {
  try {
    const [rows] = await pool.execute<PermissionRow[]>(
      `SELECT module, role, allowed
       FROM role_permissions
       ORDER BY module ASC, role ASC`,
    );

    const matrix = rows.reduce<Record<string, Record<string, boolean>>>(
      (result, row) => {
        result[row.module] = {
          ...(result[row.module] ?? {}),
          [row.role]: row.allowed === 1,
        };
        return result;
      },
      {},
    );

    return jsonResponse(matrix, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = permissionsSchema.parse(await request.json());

    for (const [moduleName, roles] of Object.entries(payload)) {
      for (const [role, allowed] of Object.entries(roles)) {
        await pool.execute(
          `INSERT INTO role_permissions (module, role, allowed)
           VALUES (:module, :role, :allowed)
           ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
          {
            module: moduleName,
            role,
            allowed: allowed ? 1 : 0,
          },
        );
      }
    }

    return jsonResponse(
      { message: "Permission matrix berhasil diperbarui." },
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
