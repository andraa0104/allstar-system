import mysql from "mysql2/promise";
import { env } from "@/lib/env";

const globalForMysql = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

function createDatabasePool(): mysql.Pool {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 30000,
    connectTimeout: 15000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    queueLimit: 0,
    namedPlaceholders: true,
    timezone: "local",
    dateStrings: true,
  });
}

function getActivePool(): mysql.Pool {
  if (!globalForMysql.mysqlPool) {
    globalForMysql.mysqlPool = createDatabasePool();
  }
  return globalForMysql.mysqlPool;
}

const isTransientConnError = (err: any) => {
  return (
    err &&
    (err.code === "ECONNRESET" ||
      err.code === "PROTOCOL_CONNECTION_LOST" ||
      err.code === "EPIPE" ||
      err.code === "ETIMEDOUT" ||
      (typeof err.message === "string" && err.message.includes("Pool is closed")))
  );
};

export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    if (prop === "execute" || prop === "query") {
      return async (...args: any[]) => {
        try {
          return await (getActivePool() as any)[prop](...args);
        } catch (error: any) {
          if (isTransientConnError(error)) {
            console.warn(
              `[DB POOL] Retrying ${String(prop)} due to transient error (${error.code || error.message})`
            );
            // If the pool was closed, replace it with a fresh active pool
            if (typeof error.message === "string" && error.message.includes("Pool is closed")) {
              globalForMysql.mysqlPool = createDatabasePool();
            }
            return await (getActivePool() as any)[prop](...args);
          }
          throw error;
        }
      };
    }

    const current = getActivePool();
    const val = (current as any)[prop];
    if (typeof val === "function") {
      return val.bind(current);
    }
    return val;
  },
});
