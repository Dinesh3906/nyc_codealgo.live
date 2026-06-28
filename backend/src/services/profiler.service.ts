import { performance } from 'perf_hooks';

interface StageTime {
  start?: number;
  end?: number;
  durations: number[]; // For parallel/multiple calls (like Pinecone search, Gemini)
}

interface PlanProfile {
  startTime: number;
  endTime?: number;
  stages: Record<string, StageTime>;
  startCpu: NodeJS.CpuUsage;
  endCpu?: NodeJS.CpuUsage;
  startMemory: NodeJS.MemoryUsage;
  peakMemoryRss: number;
  peakMemoryHeap: number;
}

export class ProfilerService {
  private static profiles: Map<string, PlanProfile> = new Map();

  /**
   * Starts profiling for a plan.
   */
  static startPlan(planId: string) {
    const memory = process.memoryUsage();
    this.profiles.set(planId, {
      startTime: performance.now(),
      startCpu: process.cpuUsage(),
      startMemory: memory,
      peakMemoryRss: memory.rss,
      peakMemoryHeap: memory.heapUsed,
      stages: {}
    });
  }

  /**
   * Tracks and updates peak memory usage.
   */
  static trackPeakMemory(planId: string) {
    const profile = this.profiles.get(planId);
    if (!profile) return;
    const memory = process.memoryUsage();
    if (memory.rss > profile.peakMemoryRss) profile.peakMemoryRss = memory.rss;
    if (memory.heapUsed > profile.peakMemoryHeap) profile.peakMemoryHeap = memory.heapUsed;
  }

  /**
   * Gets or creates a stage timer structure.
   */
  private static getOrCreateStage(profile: PlanProfile, stage: string): StageTime {
    if (!profile.stages[stage]) {
      profile.stages[stage] = { durations: [] };
    }
    return profile.stages[stage];
  }

  /**
   * Marks the start of a pipeline stage.
   */
  static startStage(planId: string, stage: string) {
    const profile = this.profiles.get(planId);
    if (!profile) return;
    this.trackPeakMemory(planId);

    const stageTime = this.getOrCreateStage(profile, stage);
    stageTime.start = performance.now();
  }

  /**
   * Marks the end of a pipeline stage and records duration.
   */
  static endStage(planId: string, stage: string) {
    const profile = this.profiles.get(planId);
    if (!profile) return;
    this.trackPeakMemory(planId);

    const stageTime = profile.stages[stage];
    if (stageTime && stageTime.start !== undefined) {
      stageTime.end = performance.now();
      const duration = stageTime.end - stageTime.start;
      stageTime.durations.push(duration);
      stageTime.start = undefined; // reset for potential reuse
    }
  }

  /**
   * Records a standalone duration for a stage.
   */
  static recordDuration(planId: string, stage: string, durationMs: number) {
    const profile = this.profiles.get(planId);
    if (!profile) return;
    this.trackPeakMemory(planId);

    const stageTime = this.getOrCreateStage(profile, stage);
    stageTime.durations.push(durationMs);
  }

  /**
   * Ends profiling for a plan.
   */
  static endPlan(planId: string) {
    const profile = this.profiles.get(planId);
    if (!profile) return;
    profile.endTime = performance.now();
    profile.endCpu = process.cpuUsage(profile.startCpu);
    this.trackPeakMemory(planId);
  }

  /**
   * Compiles the profiling summary metrics.
   */
  static getSummary(planId: string) {
    const profile = this.profiles.get(planId);
    if (!profile) return null;

    this.endPlan(planId);

    const totalTimeMs = (profile.endTime || performance.now()) - profile.startTime;

    const getStageStats = (stage: string) => {
      const stageTime = profile.stages[stage];
      if (!stageTime || stageTime.durations.length === 0) {
        return { count: 0, total: 0, avg: 0, max: 0, min: 0 };
      }
      const total = stageTime.durations.reduce((a, b) => a + b, 0);
      const count = stageTime.durations.length;
      return {
        count,
        total: Math.round(total),
        avg: Math.round(total / count),
        max: Math.round(Math.max(...stageTime.durations)),
        min: Math.round(Math.min(...stageTime.durations))
      };
    };

    const pdfRead = getStageStats('pdfRead');
    const pageRouting = getStageStats('pageRouting');
    const pageExtraction = getStageStats('pageExtraction');
    const pineconeSearch = getStageStats('pineconeSearch');
    const geminiFlash = getStageStats('geminiFlash');
    const geminiPro = getStageStats('geminiPro');
    const debate = getStageStats('debate');
    const cacheCleanup = getStageStats('cacheCleanup');

    // Format human-readable output
    const fmtTime = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
    
    let textSummary = `\n================ PERFORMANCE PROFILE SUMMARY =================\n`;
    textSummary += `PDF Read/Parse....... ${fmtTime(pdfRead.total)}\n`;
    textSummary += `Page Routing......... ${fmtTime(pageRouting.total)}\n`;
    textSummary += `Page Extraction...... ${fmtTime(pageExtraction.total)}\n`;
    textSummary += `Pinecone Search...... ${fmtTime(pineconeSearch.total)} (Count: ${pineconeSearch.count}, Avg: ${fmtTime(pineconeSearch.avg)}, Max: ${fmtTime(pineconeSearch.max)})\n`;
    textSummary += `Gemini Flash......... ${fmtTime(geminiFlash.total)} (Count: ${geminiFlash.count}, Avg: ${fmtTime(geminiFlash.avg)}, Max: ${fmtTime(geminiFlash.max)})\n`;
    textSummary += `Gemini Pro........... ${fmtTime(geminiPro.total)} (Count: ${geminiPro.count}, Avg: ${fmtTime(geminiPro.avg)}, Max: ${fmtTime(geminiPro.max)})\n`;
    textSummary += `Adversarial Debate... ${fmtTime(debate.total)} (Count: ${debate.count}, Avg: ${fmtTime(debate.avg)})\n`;
    textSummary += `Cache Cleanup........ ${fmtTime(cacheCleanup.total)}\n`;
    textSummary += `---------------------------------------------------------------\n`;
    textSummary += `TOTAL TIME........... ${fmtTime(totalTimeMs)}\n`;
    textSummary += `===============================================================\n`;
    textSummary += `Peak Memory RSS...... ${(profile.peakMemoryRss / 1024 / 1024).toFixed(2)} MB\n`;
    textSummary += `Peak Memory Heap..... ${(profile.peakMemoryHeap / 1024 / 1024).toFixed(2)} MB\n`;
    if (profile.endCpu) {
      const cpuTotalMs = (profile.endCpu.user + profile.endCpu.system) / 1000;
      textSummary += `Total CPU Time....... ${cpuTotalMs.toFixed(2)} ms (User: ${(profile.endCpu.user / 1000).toFixed(2)} ms, System: ${(profile.endCpu.system / 1000).toFixed(2)} ms)\n`;
    }
    textSummary += `===============================================================\n`;

    console.log(textSummary);

    // Clean up
    this.profiles.delete(planId);

    return {
      totalTimeMs: Math.round(totalTimeMs),
      stages: {
        pdfRead,
        pageRouting,
        pageExtraction,
        pineconeSearch,
        geminiFlash,
        geminiPro,
        debate,
        cacheCleanup
      },
      resources: {
        peakMemoryRssMb: parseFloat((profile.peakMemoryRss / 1024 / 1024).toFixed(2)),
        peakMemoryHeapMb: parseFloat((profile.peakMemoryHeap / 1024 / 1024).toFixed(2)),
        cpuUsageUs: profile.endCpu
      },
      textSummary
    };
  }
}
