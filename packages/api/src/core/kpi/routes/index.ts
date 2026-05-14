import { Hono } from "hono";
import { KpiCalculatorService } from "../services/kpi-calculator.service.js";
import { LatencyByAgentService } from "../services/latency-by-agent.service.js";
import { KPI_IDS } from "../types.js";
import type { Env } from "../../../env.js";

export const kpiApp = new Hono<{ Bindings: Env }>();

kpiApp.get("/latency-by-agent", async (c) => {
  const since = c.req.query("since");
  const svc = new LatencyByAgentService(c.env.DB);
  const result = await svc.calculateByAgent(since);
  return c.json(result, 200);
});

kpiApp.get("/", async (c) => {
  const orgId = c.req.query("orgId");
  const svc = new KpiCalculatorService(c.env.DB);
  const kpis = await svc.computeAll(orgId);
  return c.json({ kpis, computedAt: new Date().toISOString() }, 200);
});

kpiApp.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!KPI_IDS.includes(id as (typeof KPI_IDS)[number])) {
    return c.json({ error: `Unknown KPI id: ${id}. Valid ids: ${KPI_IDS.join(", ")}` }, 404);
  }
  const orgId = c.req.query("orgId");
  const svc = new KpiCalculatorService(c.env.DB);
  const all = await svc.computeAll(orgId);
  const kpi = all.find((k) => k.id === id);
  if (!kpi) return c.json({ error: "Not found" }, 404);
  return c.json(kpi, 200);
});
