import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(_execFile);

interface ExecResult {
  stdout: string;
  stderr: string;
  status: "ok" | "error";
}

/** shell-safe subprocess runner (args 배열 분리, shell injection 방지) */
export async function execFileNoThrow(
  cmd: string,
  args: string[],
  options?: { cwd?: string },
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFilePromise(cmd, args, options ?? {});
    return { stdout, stderr, status: "ok" };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
      status: "error",
    };
  }
}
