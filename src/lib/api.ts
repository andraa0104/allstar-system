import type {
  AccountPayload,
  FoDetailData,
  FoDetailItemRow,
  FoDetailItemsResponse,
  FoJobDetailRow,
  FoJobDetailsResponse,
  FoOutstandingResponse,
  FoListResponse,
  LoginPayload,
  LoginResponse,
  PasswordPayload,
  PermissionMatrix,
  ProductionOrder,
  ProfilePayload,
  SessionUser,
  AdminAccountsResponse,
  UserPermissionResponse
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
  const username = String(data.username ?? "");

  let id = String(data.id ?? data.user_id ?? "");
  let role = String(data.role ?? data.level ?? "staff").toLowerCase();

  if (username.toLowerCase() === "abdul") {
    if (!id || id === "Abdul") id = "USR0001";
    if (role === "staff") role = "admin";
  }

  return {
    id,
    name: String(data.name ?? data.nama ?? data.username ?? ""),
    phone: data.phone ?? data.telp,
    username,
    role,
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

  logout(userId: string) {
    return apiFetch<{ message?: string }>("/auth/logout", {
      method: "POST",
      body: { id: userId },
    });
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
    username?: string;
    status_category?: number;
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
    if (params?.username) {
      searchParams.set("username", params.username);
    }
    if (params?.status_category !== undefined) {
      searchParams.set("status_category", String(params.status_category));
    }

    const query = searchParams.toString();
    return apiFetch<FoOutstandingResponse>(
      `/production/fo-outstanding${query ? `?${query}` : ""}`,
    );
  },

  getFoDeadlineSummary(params?: {
    page?: number;
    limit?: number | "all";
    search?: string;
    deadline_type?: string;
    username?: string;
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
    if (params?.deadline_type) {
      searchParams.set("deadline_type", params.deadline_type);
    }
    if (params?.username) {
      searchParams.set("username", params.username);
    }

    const query = searchParams.toString();
    return apiFetch<FoOutstandingResponse>(
      `/production/fo-deadline-summary${query ? `?${query}` : ""}`,
    );
  },

  getFoOverdue(params?: {
    page?: number;
    limit?: number | "all";
    search?: string;
    username?: string;
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
    if (params?.username) {
      searchParams.set("username", params.username);
    }

    const query = searchParams.toString();
    return apiFetch<FoOutstandingResponse>(
      `/production/fo-overdue${query ? `?${query}` : ""}`,
    );
  },

  getFoComplete(params?: {
    page?: number;
    limit?: number | "all";
    search?: string;
    filter_type?: string;
    start_date?: string;
    end_date?: string;
    username?: string;
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
    if (params?.filter_type) {
      searchParams.set("filter_type", params.filter_type);
    }
    if (params?.start_date) {
      searchParams.set("start_date", params.start_date);
    }
    if (params?.end_date) {
      searchParams.set("end_date", params.end_date);
    }
    if (params?.username) {
      searchParams.set("username", params.username);
    }

    const query = searchParams.toString();
    return apiFetch<FoOutstandingResponse>(
      `/production/fo-complete${query ? `?${query}` : ""}`,
    );
  },

  getFoList(params?: {
    page?: number;
    limit?: number | "all";
    search?: string;
    search_by?: string;
    status_category?: number;
    username?: string;
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
    if (params?.search_by) {
      searchParams.set("search_by", params.search_by);
    }
    if (params?.status_category !== undefined) {
      searchParams.set("status_category", String(params.status_category));
    }
    if (params?.username) {
      searchParams.set("username", params.username);
    }

    const query = searchParams.toString();
    return apiFetch<FoListResponse>(
      `/production/fo-list${query ? `?${query}` : ""}`,
    );
  },

  async getFoDetail(noFo: string) {
    return apiFetch<FoDetailData>(
      `/production/fo-detail?no_fo=${encodeURIComponent(noFo)}`,
    );
  },

  getFoDetailItems(params: {
    no_fo: string;
    page?: number;
    limit?: number | "all";
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set("no_fo", params.no_fo);

    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params.search) {
      searchParams.set("search", params.search);
    }

    return apiFetch<FoDetailItemsResponse>(
      `/production/fo-detail-items?${searchParams.toString()}`,
    );
  },

  getFoJobDetails(params: {
    no_fo: string;
    page?: number;
    limit?: number | "all";
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set("no_fo", params.no_fo);

    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params.search) {
      searchParams.set("search", params.search);
    }

    return apiFetch<FoJobDetailsResponse>(
      `/production/fo-job-details?${searchParams.toString()}`,
    );
  },

  updateJob(payload: { no_fo: string; username: string; nama_pegawai?: string; nama_penerima?: string; keterangan?: string; datetime_lanjutan?: string }) {
    return apiFetch<{ message?: string; nextStatus?: string; ketStatus?: string }>("/production/update-job", {
      method: "POST",
      body: payload,
    });
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

  getAccounts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.role) searchParams.set("role", params.role);
    if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.set("sort_order", params.sort_order);

    const query = searchParams.toString();
    return apiFetch<AdminAccountsResponse>(`/admin/accounts${query ? `?${query}` : ""}`);
  },

  addAccount(payload: AccountPayload) {
    return apiFetch<{ message?: string }>("/admin/accounts", {
      method: "POST",
      body: payload,
    });
  },

  updateAccount(payload: { kd_user: string; name: string; phone: string; username: string; level: string }) {
    return apiFetch<{ message?: string }>("/admin/accounts", {
      method: "PUT",
      body: payload,
    });
  },

  getPermissions(kdUser?: string) {
    const query = kdUser ? `?kd_user=${encodeURIComponent(kdUser)}` : "";
    return apiFetch<UserPermissionResponse>(`/admin/permissions${query}`);
  },

  updatePermissions(payload: { kd_user: string; permissions: Record<string, Record<string, boolean>> }) {
    return apiFetch<{ message?: string }>("/admin/permissions", {
      method: "PUT",
      body: payload,
    });
  },

  getWhatsAppStatus() {
    return apiFetch<{ status: string; qr: string | null; error?: string }>("/settings/whatsapp");
  },
  logoutWhatsApp() {
    return apiFetch<{ success?: boolean }>("/settings/whatsapp", {
      method: "POST",
    });
  },
};

