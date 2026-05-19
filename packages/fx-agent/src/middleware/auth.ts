// F571: fx-agent auth middleware — harness-kit createAuthMiddleware 사용
import { createAuthMiddleware } from "@ktds-axbd/harness-kit";
import type { JwtPayload } from "@ktds-axbd/harness-kit";

export type { JwtPayload };

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-agent",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: ["/api/agent/health"],
});
