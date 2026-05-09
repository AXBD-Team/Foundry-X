diff --git a/packages/fx-modules/package.json b/packages/fx-modules/package.json
index 7322a19f..88201098 100644
--- a/packages/fx-modules/package.json
+++ b/packages/fx-modules/package.json
@@ -14,7 +14,7 @@
     "@foundry-x/harness-kit": "workspace:*",
     "@foundry-x/shared": "workspace:*",
     "@foundry-x/shared-contracts": "workspace:*",
-    "@hono/zod-openapi": "^0.9.0",
+    "@hono/zod-openapi": "^0.18.4",
     "drizzle-orm": "^0.31.2",
     "hono": "^4.0.0",
     "zod": "^3.23.0"
diff --git a/packages/fx-modules/src/core/portal/routes/github.ts b/packages/fx-modules/src/core/portal/routes/github.ts
index 7477e998..12ab8f76 100644
--- a/packages/fx-modules/src/core/portal/routes/github.ts
+++ b/packages/fx-modules/src/core/portal/routes/github.ts
@@ -56,7 +56,7 @@ githubRoute.openapi(reviewPrRoute, async (c) => {
 
   try {
     const result = await reviewSvc.reviewPr(prNumber);
-    return c.json(result);
+    return c.json(result, 200);
   } catch (err) {
     if (err instanceof ReviewCooldownError) {
       return c.json({ error: err.message }, 429);
@@ -112,5 +112,5 @@ githubRoute.openapi(getReviewRoute, async (c) => {
   if (!result) {
     return c.json({ error: "No review found for this PR" }, 404);
   }
-  return c.json(result);
+  return c.json(result, 200);
 });
diff --git a/packages/fx-modules/src/core/portal/routes/kpi.ts b/packages/fx-modules/src/core/portal/routes/kpi.ts
index aa06ed66..15f9fcf3 100644
--- a/packages/fx-modules/src/core/portal/routes/kpi.ts
+++ b/packages/fx-modules/src/core/portal/routes/kpi.ts
@@ -298,5 +298,5 @@ kpiRoute.openapi(getWeeklySummary, async (c) => {
     topPages: (topPagesResult.results ?? [])
       .filter((r) => r.path)
       .map((r) => ({ path: r.path!, views: r.views })),
-  });
+  }, 200);
 });
diff --git a/packages/fx-modules/src/core/portal/routes/nps.ts b/packages/fx-modules/src/core/portal/routes/nps.ts
index b4a0563d..b4590e95 100644
--- a/packages/fx-modules/src/core/portal/routes/nps.ts
+++ b/packages/fx-modules/src/core/portal/routes/nps.ts
@@ -98,5 +98,5 @@ npsRoute.openapi(getOrgNpsSummary, async (c) => {
   const service = new NpsService(c.env.DB);
 
   const summary = await service.getOrgSummary(orgId);
-  return c.json(summary);
+  return c.json(summary, 200);
 });
diff --git a/packages/fx-modules/src/core/portal/routes/onboarding.ts b/packages/fx-modules/src/core/portal/routes/onboarding.ts
index c0bc4511..0c55032c 100644
--- a/packages/fx-modules/src/core/portal/routes/onboarding.ts
+++ b/packages/fx-modules/src/core/portal/routes/onboarding.ts
@@ -88,7 +88,7 @@ onboardingRoute.openapi(completeStep, async (c) => {
       });
     }
 
-    return c.json(result);
+    return c.json(result, 200);
   } catch (err) {
     const message = err instanceof Error ? err.message : "Unknown error";
     return c.json({ error: message }, 400);
diff --git a/packages/fx-modules/src/core/portal/routes/org-shared.ts b/packages/fx-modules/src/core/portal/routes/org-shared.ts
index 63bb9bf0..c2848f4b 100644
--- a/packages/fx-modules/src/core/portal/routes/org-shared.ts
+++ b/packages/fx-modules/src/core/portal/routes/org-shared.ts
@@ -43,7 +43,7 @@ orgSharedRoute.openapi(getSharedBmcs, async (c) => {
   const service = new OrgSharedService(c.env.DB);
 
   const result = await service.getSharedBmcs(orgId, { page, limit });
-  return c.json(result);
+  return c.json(result, 200);
 });
 
 // ─── GET /orgs/:orgId/shared/activity ───
@@ -77,5 +77,5 @@ orgSharedRoute.openapi(getActivityFeed, async (c) => {
   const service = new OrgSharedService(c.env.DB);
 
   const items = await service.getActivityFeed(orgId, limit);
-  return c.json({ items });
+  return c.json({ items }, 200);
 });
diff --git a/packages/fx-modules/src/core/portal/routes/party-session.ts b/packages/fx-modules/src/core/portal/routes/party-session.ts
index a8c0ef15..acdd8d3d 100644
--- a/packages/fx-modules/src/core/portal/routes/party-session.ts
+++ b/packages/fx-modules/src/core/portal/routes/party-session.ts
@@ -96,7 +96,7 @@ partySessionRoute.openapi(getSession, async (c) => {
 
   const session = await svc.getSession(id);
   if (!session) return c.json({ error: "Session not found" }, 404);
-  return c.json(session);
+  return c.json(session, 200);
 });
 
 // ─── POST /api/party-sessions/:id/join ───
diff --git a/packages/fx-modules/src/core/portal/routes/reconciliation.ts b/packages/fx-modules/src/core/portal/routes/reconciliation.ts
index 5dce25b1..dd990085 100644
--- a/packages/fx-modules/src/core/portal/routes/reconciliation.ts
+++ b/packages/fx-modules/src/core/portal/routes/reconciliation.ts
@@ -56,7 +56,7 @@ reconciliationRoute.openapi(postRun, async (c) => {
   const service = new ReconciliationService(c.env.DB, github, specParser);
 
   const result = await service.run(tenantId ?? "default", "manual", strategy);
-  return c.json(result);
+  return c.json(result, 200);
 });
 
 // ─── GET /api/reconciliation/status ───
diff --git a/packages/fx-modules/src/core/portal/routes/wiki.ts b/packages/fx-modules/src/core/portal/routes/wiki.ts
index 60a5e79c..38453a49 100644
--- a/packages/fx-modules/src/core/portal/routes/wiki.ts
+++ b/packages/fx-modules/src/core/portal/routes/wiki.ts
@@ -110,7 +110,7 @@ wikiRoute.openapi(getWikiPage, async (c) => {
     filePath: page.filePath ?? "",
     lastModified: page.updatedAt,
     author: page.updatedBy ?? "system",
-  });
+  }, 200);
 });
 
 // ─── PUT /wiki/:slug ───
@@ -172,7 +172,7 @@ wikiRoute.openapi(updateWikiPage, async (c) => {
     );
   }
 
-  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" });
+  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" }, 200);
 });
 
 // ─── POST /wiki ───
@@ -269,5 +269,5 @@ wikiRoute.openapi(deleteWikiPage, async (c) => {
 
   await db.delete(wikiPages).where(eq(wikiPages.slug, slug));
 
-  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" });
+  return c.json({ ok: true as const, slug, filePath: existing.filePath ?? "" }, 200);
 });
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 74c7c06c..b3d56b54 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -269,8 +269,8 @@ importers:
         specifier: workspace:*
         version: link:../shared-contracts
       '@hono/zod-openapi':
-        specifier: ^0.9.0
-        version: 0.9.10(hono@4.12.8)(zod@3.25.76)
+        specifier: ^0.18.4
+        version: 0.18.4(hono@4.12.8)(zod@3.25.76)
       drizzle-orm:
         specifier: ^0.31.2
         version: 0.31.4(@cloudflare/workers-types@4.20260316.1)(@opentelemetry/api@1.9.1)(@types/better-sqlite3@7.6.13)(@types/react@18.3.28)(better-sqlite3@12.8.0)(react@18.3.1)
