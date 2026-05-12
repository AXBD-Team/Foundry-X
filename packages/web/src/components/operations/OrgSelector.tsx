// F621: Org unit selector — 전체 / 단일 본부 / 4 본부 동시
import type { OrgUnit, OrgFilter } from "./types";

interface OrgSelectorProps {
  orgUnits: OrgUnit[];
  selected: OrgFilter;
  onChange: (filter: OrgFilter) => void;
}

export function OrgSelector({ orgUnits, selected, onChange }: OrgSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="본부 필터">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === "all"
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        전체
      </button>
      {orgUnits.map((org) => (
        <button
          key={org.id}
          onClick={() => onChange(org.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selected === org.id
              ? "text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          style={selected === org.id ? { backgroundColor: org.color } : undefined}
        >
          {org.label}
        </button>
      ))}
    </div>
  );
}
