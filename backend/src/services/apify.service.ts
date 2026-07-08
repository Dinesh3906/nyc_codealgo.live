import { Logger } from './logger';

const logger = new Logger({ stage: 'apify-service' });

export interface ApifyViolation {
  id: string;
  number: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  status: 'open' | 'resolved';
  date: string;
}

export interface PropertyData {
  address: string;
  activeViolationsCount: number;
  openComplaintsCount: number;
  violations: ApifyViolation[];
  source: 'Apify Real-time';
}

export class ApifyService {
  /**
   * Fetches DOB/BIS property records and active violations for a given NYC address.
   * Real-time query only; returns empty results on failure or missing API key.
   */
  static async fetchPropertyData(address: string): Promise<PropertyData> {
    const cleanAddress = address ? address.trim() : '';
    logger.info(`Fetching property records for address: "${cleanAddress}"`);

    const apiKey = process.env.APIFY_API_KEY;

    if (!apiKey) {
      logger.warn('APIFY_API_KEY is not configured. Returning empty property data.');
      return {
        address: cleanAddress,
        activeViolationsCount: 0,
        openComplaintsCount: 0,
        violations: [],
        source: 'Apify Real-time',
      };
    }

    try {
      // Use AbortController for a strict timeout of 8 seconds to prevent blocking the plan audit pipeline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Call Apify API to run the web scraper actor
      const actorId = process.env.APIFY_ACTOR_ID || 'apify~web-scraper';
      const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}&wait=5`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: cleanAddress,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Apify request failed with status: ${response.status}`);
      }

      const runResult = await response.json();
      const datasetId = runResult?.data?.defaultDatasetId;

      if (!datasetId) {
        throw new Error('Apify actor run did not return a valid datasetId');
      }

      // Fetch the results from the dataset
      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`;
      const datasetResponse = await fetch(datasetUrl);
      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset items: ${datasetResponse.status}`);
      }

      const items = await datasetResponse.json();
      logger.info(`Successfully retrieved ${items.length} items from Apify dataset.`);

      return this.parseApifyItems(cleanAddress, items);

    } catch (err: any) {
      logger.error('Apify service call encountered an error. Returning empty property dataset.', err);
      return {
        address: cleanAddress,
        activeViolationsCount: 0,
        openComplaintsCount: 0,
        violations: [],
        source: 'Apify Real-time',
      };
    }
  }

  /**
   * Helper to parse items returned from the Apify scraper dataset.
   */
  private static parseApifyItems(address: string, items: any[]): PropertyData {
    const violations: ApifyViolation[] = [];
    let openComplaints = 0;

    for (const item of items) {
      if (item.complaintStatus === 'open') {
        openComplaints++;
      }
      if (item.violationNumber) {
        violations.push({
          id: item.violationId || Math.random().toString(36).substr(2, 9),
          number: item.violationNumber,
          severity: item.severity === 'critical' || item.severity === 'major' ? item.severity : 'minor',
          description: item.violationDescription || 'NYC DOB Building Code Violation',
          status: item.status === 'open' ? 'open' : 'resolved',
          date: item.date || new Date().toISOString().split('T')[0],
        });
      }
    }

    const activeViolationsCount = violations.filter(v => v.status === 'open').length;

    return {
      address,
      activeViolationsCount,
      openComplaintsCount: openComplaints,
      violations,
      source: 'Apify Real-time',
    };
  }
}
