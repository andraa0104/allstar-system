"use client";

import type { SessionUser } from "@/lib/types";

const SESSION_KEY = "allstar_session";

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(user: SessionUser) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  window.sessionStorage.setItem("id", user.id);
  window.sessionStorage.setItem("name", user.name);
  window.sessionStorage.setItem("phone", user.phone ?? "");
  window.sessionStorage.setItem("username", user.username);
  window.sessionStorage.setItem("role", user.role);
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem("id");
  window.sessionStorage.removeItem("name");
  window.sessionStorage.removeItem("phone");
  window.sessionStorage.removeItem("username");
  window.sessionStorage.removeItem("role");
}

export function isAdmin(user: SessionUser | null) {
  return user?.role?.toLowerCase() === "admin";
}
