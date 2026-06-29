/**
 * Prometheus-compatible metrics service.
 * Exposes counters, histograms, and gauges for all pipeline stages.
 * Serves metrics at GET /metrics in Prometheus text exposition format.
 */

import { Logger } from './logger';

const logger = new Logger({ stage: 'metrics' });

// ─── Metric types ───

interface Counter {
  name: string;
  help: string;
  labels: Map<string, number>;
}

interface Histogram {
  name: string;
  help: string;
  buckets: number[];
  observations: Map<string, number[]>;
}

interface Gauge {
  name: string;
  help: string;
  value: Map<string, number>;
}

class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  // ─── Counter operations ───

  registerCounter(name: string, help: string) {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, labels: new Map() });
    }
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1) {
    const counter = this.counters.get(name);
    if (!counter) return;
    const key = this.labelKey(labels);
    counter.labels.set(key, (counter.labels.get(key) || 0) + value);
  }

  // ─── Histogram operations ───

  registerHistogram(name: string, help: string, buckets: number[] = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300]) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, { name, help, buckets: buckets.sort((a, b) => a - b), observations: new Map() });
    }
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    const histogram = this.histograms.get(name);
    if (!histogram) return;
    const key = this.labelKey(labels);
    if (!histogram.observations.has(key)) {
      histogram.observations.set(key, []);
    }
    histogram.observations.get(key)!.push(value);
  }

  // ─── Gauge operations ───

  registerGauge(name: string, help: string) {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, value: new Map() });
    }
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const gauge = this.gauges.get(name);
    if (!gauge) return;
    const key = this.labelKey(labels);
    gauge.value.set(key, value);
  }

  incrementGauge(name: string, value = 1, labels: Record<string, string> = {}) {
    const gauge = this.gauges.get(name);
    if (!gauge) return;
    const key = this.labelKey(labels);
    gauge.value.set(key, (gauge.value.get(key) || 0) + value);
  }

  decrementGauge(name: string, value = 1, labels: Record<string, string> = {}) {
    const gauge = this.gauges.get(name);
    if (!gauge) return;
    const key = this.labelKey(labels);
    gauge.value.set(key, (gauge.value.get(key) || 0) - value);
  }

  // ─── Export in Prometheus text format ───

  serialize(): string {
    const lines: string[] = [];

    // Counters
    for (const [, counter] of this.counters) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const [labelStr, value] of counter.labels) {
        lines.push(`${counter.name}${labelStr} ${value}`);
      }
    }

    // Histograms
    for (const [, histogram] of this.histograms) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      for (const [labelStr, observations] of histogram.observations) {
        const sorted = [...observations].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const count = sorted.length;
        const labelPrefix = labelStr ? labelStr.slice(0, -1) + ',' : '{';

        for (const bucket of histogram.buckets) {
          const bucketCount = sorted.filter(v => v <= bucket).length;
          lines.push(`${histogram.name}_bucket${labelPrefix}le="${bucket}"} ${bucketCount}`);
        }
        lines.push(`${histogram.name}_bucket${labelPrefix}le="+Inf"} ${count}`);
        lines.push(`${histogram.name}_sum${labelStr} ${sum.toFixed(6)}`);
        lines.push(`${histogram.name}_count${labelStr} ${count}`);
      }
    }

    // Gauges
    for (const [, gauge] of this.gauges) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const [labelStr, value] of gauge.value) {
        lines.push(`${gauge.name}${labelStr} ${value}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private labelKey(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
  }
}

// ─── Global registry with pre-registered metrics ───

export const metrics = new MetricsRegistry();

// Counters
metrics.registerCounter('nyc_audits_total', 'Total number of audit runs');
metrics.registerCounter('nyc_audits_failed_total', 'Total number of failed audits');
metrics.registerCounter('nyc_audits_partial_total', 'Total number of partial/degraded audits');
metrics.registerCounter('nyc_gemini_requests_total', 'Total Gemini API requests');
metrics.registerCounter('nyc_pinecone_requests_total', 'Total Pinecone API requests');
metrics.registerCounter('nyc_deterministic_checks_total', 'Total deterministic rule evaluations');
metrics.registerCounter('nyc_citation_rejections_total', 'Total rejected hallucinated citations');
metrics.registerCounter('nyc_circuit_breaker_trips_total', 'Total circuit breaker OPEN transitions');
metrics.registerCounter('nyc_retries_total', 'Total retry attempts');
metrics.registerCounter('nyc_dlq_entries_total', 'Total dead letter queue entries');

// Histograms (values in seconds)
metrics.registerHistogram('nyc_audit_duration_seconds', 'Audit pipeline duration in seconds');
metrics.registerHistogram('nyc_gemini_latency_seconds', 'Gemini API call latency in seconds', [0.5, 1, 2, 5, 10, 20, 30, 60, 90, 120]);
metrics.registerHistogram('nyc_pinecone_latency_seconds', 'Pinecone API call latency in seconds', [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]);
metrics.registerHistogram('nyc_stage_duration_seconds', 'Pipeline stage duration in seconds');

// Gauges
metrics.registerGauge('nyc_queue_depth', 'Current queue depth');
metrics.registerGauge('nyc_active_audits', 'Currently running audits');
metrics.registerGauge('nyc_circuit_breaker_state', 'Circuit breaker state (0=closed, 1=half-open, 2=open)');
metrics.registerGauge('nyc_memory_rss_bytes', 'Process RSS memory in bytes');
metrics.registerGauge('nyc_memory_heap_bytes', 'Process heap memory in bytes');

// Sprint v2 Gauges
metrics.registerGauge('nyc_citation_hallucination_rate', 'Rate of citation hallucinations detected');
metrics.registerGauge('nyc_retrieval_precision', 'Precision of Pinecone retrieval matches');
metrics.registerGauge('nyc_judge_disagreement', 'Rate of disagreements between Challenger and Auditor');
metrics.registerGauge('nyc_ocr_confidence', 'Extracted visual fact OCR confidence');
metrics.registerGauge('nyc_token_cost', 'Token usage cost in USD');
metrics.registerGauge('nyc_per_discipline_accuracy', 'Per discipline code compliance verification accuracy');

/**
 * Updates system gauges (call periodically or before scrape).
 */
export function updateSystemMetrics() {
  const mem = process.memoryUsage();
  metrics.setGauge('nyc_memory_rss_bytes', mem.rss);
  metrics.setGauge('nyc_memory_heap_bytes', mem.heapUsed);
}
