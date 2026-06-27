import 'dotenv/config';
import assert from 'assert';
import { SchedulerService } from '../services/scheduler.service';
import { GeminiClient } from '../services/gemini.client';

// Simple mock for GeminiClient.requestWithRetry
let mockCallCount = 0;
const originalRequestWithRetry = GeminiClient.requestWithRetry;

async function runTest() {
  console.log("🧪 Starting AI Challenger Debate Loop Unit Test...");

  // Mock implementation of requestWithRetry to return predictable JSON payloads
  GeminiClient.requestWithRetry = async (model: string, payload: any): Promise<any> => {
    mockCallCount++;
    if (mockCallCount === 1) {
      // Challenger call
      return {
        text: JSON.stringify({
          rebuttals: [
            {
              code: "BC 1008.1.1",
              argument: "Mechanical boiler room exception applies under Section BC 1008.1.1.1."
            },
            {
              code: "BC 1009.3",
              argument: "Staircase is not on the primary egress path."
            }
          ]
        })
      };
    } else {
      // Judge call
      return {
        text: JSON.stringify({
          rulings: [
            {
              code: "BC 1008.1.1",
              verdict: "ACCEPT",
              explanation: "Accepted. The mechanical space exception indeed applies."
            },
            {
              code: "BC 1009.3",
              verdict: "REJECT",
              explanation: "Rejected. Drawing indicates this is the primary egress stairway, so 44 inches is mandatory."
            }
          ]
        })
      };
    }
  };

  const mockStepConfig = { name: "NYC Building Code (BC)" };
  const mockResultJSON = {
    score: 80,
    checklist_evaluations: [
      { code: "BC 1008.1.1", status: "violation", details: "Doorway width is 30 inches." },
      { code: "BC 1009.3", status: "violation", details: "Stairwell width is 36 inches." }
    ],
    issues: [
      { code: "BC 1008.1.1", title: "Narrow Doorway", description: "Doorway is 30 inches.", deduction_percentage: 10 },
      { code: "BC 1009.3", title: "Narrow Stairwell", description: "Stairwell is 36 inches.", deduction_percentage: 10 }
    ]
  };

  const mockCacheResult = { cacheName: "test-cache" };

  try {
    const updatedResult = await SchedulerService.runChallengerDebate(
      "building_code",
      mockStepConfig,
      mockResultJSON,
      mockCacheResult,
      "application/pdf",
      [1],
      false,
      "test-plan-id"
    );

    console.log("Result Evaluations:", JSON.stringify(updatedResult.checklist_evaluations, null, 2));
    console.log("Result Issues:", JSON.stringify(updatedResult.issues, null, 2));
    console.log("Result Score:", updatedResult.score);

    // Verify BC 1008.1.1 was ACCEPTED (status -> compliant, removed from issues)
    const doorEval = updatedResult.checklist_evaluations.find((e: any) => e.code === "BC 1008.1.1");
    assert.strictEqual(doorEval.status, "compliant", "BC 1008.1.1 should be marked compliant");
    assert.ok(doorEval.details.includes("[CLEARED VIA DEBATE]"), "Details should mention debate clearance");

    const doorIssue = updatedResult.issues.find((i: any) => i.code === "BC 1008.1.1");
    assert.strictEqual(doorIssue, undefined, "BC 1008.1.1 should be removed from active issues");

    // Verify BC 1009.3 was REJECTED (status -> still violation, stands, debate log appended)
    const stairIssue = updatedResult.issues.find((i: any) => i.code === "BC 1009.3");
    assert.ok(stairIssue !== undefined, "BC 1009.3 should remain in active issues");
    assert.ok(stairIssue.description.includes("⚖️ AI DEBATE LOG"), "Description should contain debate log");
    assert.ok(stairIssue.description.includes("Staircase is not on the primary egress path."), "Should show defense argument");
    assert.ok(stairIssue.description.includes("Rejected. Drawing indicates this is the primary egress stairway"), "Should show judge explanation");

    // Verify score was recalculated (100 - 10 deduction for BC 1009.3 = 90)
    assert.strictEqual(updatedResult.score, 90, "Score should be recalculated to 90");

    console.log("✓ Pass: Accepted defenses clear violations");
    console.log("✓ Pass: Rejected defenses stand and append debate log");
    console.log("✓ Pass: Score recalculated correctly");
    console.log("\n🎉 AI Challenger Debate Loop unit tests passed successfully!");
  } catch (e: any) {
    console.error("Test failed:", e);
    process.exit(1);
  } finally {
    // Restore original method
    GeminiClient.requestWithRetry = originalRequestWithRetry;
  }
}

runTest();
