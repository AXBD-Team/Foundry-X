// F619: Decode-X Phase 2-E stub adapter — in-memory event publisher, no external dependencies
import {
  AnalysisCompletedEventSchema,
  type AnalysisCompletedEvent,
  type DecodeXAdapter,
} from "../types.js";
import type { SafeParseReturnType } from "zod";

export class DecodeXStubAdapter implements DecodeXAdapter {
  private readonly queue: AnalysisCompletedEvent[] = [];

  async publishAnalysisCompleted(event: AnalysisCompletedEvent): Promise<void> {
    this.queue.push(event);
  }

  getEventQueue(): AnalysisCompletedEvent[] {
    return [...this.queue];
  }

  clearEventQueue(): void {
    this.queue.length = 0;
  }

  getLastEvent(): AnalysisCompletedEvent | undefined {
    return this.queue.at(-1);
  }

  static parseEventSafe(raw: unknown): SafeParseReturnType<unknown, AnalysisCompletedEvent> {
    return AnalysisCompletedEventSchema.safeParse(raw);
  }
}
