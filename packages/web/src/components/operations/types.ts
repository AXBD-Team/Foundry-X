// F621: Operations dashboard types

export interface OrgUnit {
  id: string;
  label: string;
  color: string;
}

export const ORG_UNITS: OrgUnit[] = [
  { id: "KOAMI",     label: "KOAMI",     color: "#6366f1" },
  { id: "AXIS-DS",   label: "AXIS-DS",   color: "#f59e0b" },
  { id: "Decode-X",  label: "Decode-X",  color: "#10b981" },
  { id: "Foundry-X", label: "Foundry-X", color: "#ec4899" },
];

export type OrgFilter = "all" | string;
