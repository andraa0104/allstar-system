import type {
  AccountPayload,
  FoOutstandingResponse,
  LoginPayload,
  LoginResponse,
  PasswordPayload,
  PermissionMatrix,
  ProductionOrder,
  ProfilePayload,
  SessionUser,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL belum diset.");
  }

  return API_BASE_URL.replace(/\/$/, "");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : `Request gagal dengan status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const endpoint = path.startsWith("http")
    ? path
    : `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }).then(parseResponse<T>);
}

function normalizeUser(response: LoginResponse): SessionUser {
  const data = response.data ?? response;

  return {
    id: String(data.id ?? data.user_id ?? ""),
    name: String(data.name ?? data.nama ?? data.username ?? ""),
    phone: data.phone ?? data.telp,
    username: String(data.username ?? ""),
    role: String(data.role ?? data.level ?? "staff").toLowerCase(),
  };
}

export const api = {
  async login(payload: LoginPayload) {
    const response = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });

    return normalizeUser(response);
  },

  getOrders(status: "pending" | "active" | "completed") {
    const endpoints = {
      pending: "/production/pending-inquiries",
      active: "/production/active-deadlines",
      completed: "/production/completed-archives",
    };

    return apiFetch<ProductionOrder[]>(endpoints[status]);
  },

  getFoOutstanding(params?: {
    page?: number;
    limit?: number | "all";
    search?: string;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }

    const query = searchParams.toString();
    return apiFetch<FoOutstandingResponse>(
      `/production/fo-outstanding${query ? `?${query}` : ""}`,
    );
  },

  getFoDeadlineSummary() {
    return apiFetch<{ count: number }>("/production/fo-deadline-summary");
  },

  updateProfile(payload: ProfilePayload) {
    return apiFetch<{ message?: string }>("/settings/profile", {
      method: "PUT",
      body: payload,
    });
  },

  changePassword(payload: PasswordPayload) {
    return apiFetch<{ message?: string }>("/settings/security", {
      method: "PUT",
      body: payload,
    });
  },

  deleteAccount(userId: string) {
    return apiFetch<{ message?: string }>(`/settings/profile/${userId}`, {
      method: "DELETE",
    });
  },

  addAccount(payload: AccountPayload) {
    return apiFetch<{ message?: string }>("/admin/accounts", {
      method: "POST",
      body: payload,
    });
  },

  getPermissions() {
    return apiFetch<PermissionMatrix>("/admin/permissions");
  },

  updatePermissions(payload: PermissionMatrix) {
    return apiFetch<{ message?: string }>("/admin/permissions", {
      method: "PUT",
      body: payload,
    });
  },
};
