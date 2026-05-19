// F675 TDD Red — package.json publish-ready metadata validation
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

describe("F675 package.json publish-ready metadata", () => {
  it("T37-1: name uses @ktds-axbd scope", () => {
    expect(pkg.name).toBe("@ktds-axbd/harness-kit");
  });

  it("T37-2: private field is removed or false", () => {
    expect(pkg.private).toBeFalsy();
  });

  it("T37-3: license is MIT", () => {
    expect(pkg.license).toBe("MIT");
  });

  it("T37-4: files allowlist contains dist, README, CHANGELOG, LICENSE", () => {
    expect(pkg.files).toBeDefined();
    expect(pkg.files).toContain("dist");
    expect(pkg.files).toContain("README.md");
    expect(pkg.files).toContain("CHANGELOG.md");
    expect(pkg.files).toContain("LICENSE");
  });

  it("T37-5: publishConfig sets access to public", () => {
    expect(pkg.publishConfig).toBeDefined();
    expect(pkg.publishConfig.access).toBe("public");
  });

  it("T37-6: repository field present with correct url", () => {
    expect(pkg.repository).toBeDefined();
    expect(pkg.repository.url).toContain("KTDS-AXBD/Foundry-X");
    expect(pkg.repository.directory).toBe("packages/harness-kit");
  });

  it("T37-7: keywords array is non-empty", () => {
    expect(Array.isArray(pkg.keywords)).toBe(true);
    expect(pkg.keywords.length).toBeGreaterThan(0);
  });

  it("T37-8: engines.node is >=22", () => {
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBe(">=22");
  });

  it("T37-9: @types/node devDependency is ^22", () => {
    expect(pkg.devDependencies?.["@types/node"]).toMatch(/^\^22/);
  });

  it("T37-10: description is present", () => {
    expect(typeof pkg.description).toBe("string");
    expect(pkg.description.length).toBeGreaterThan(0);
  });
});
