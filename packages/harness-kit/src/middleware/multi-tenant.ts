import type { Context, MiddlewareHandler } from "hono";
import type { JwtPayload } from "./jwt.js";

export interface MultiTenantConfig {
  bypassPaths?: string[];
  d1Binding?: string;
  onMissingOrgId?: (c: Context) => Response;
}

export interface TenantVariables {
  orgId: string;
  orgRole: string;
  userId: string;
}

export function createMultiTenantMiddleware(config: MultiTenantConfig = {}): MiddlewareHandler {
  const bypass = config.bypassPaths ?? [];
  return async (c, next) => {
    if (bypass.some((p) => c.req.path.startsWith(p))) return next();
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    if (!payload?.orgId) {
      return config.onMissingOrgId?.(c) ?? c.json({ error: "Organization context required" }, 403);
    }
    c.set("orgId", payload.orgId);
    c.set("orgRole", payload.orgRole ?? "member");
    c.set("userId", payload.sub);
    return next();
  };
}
