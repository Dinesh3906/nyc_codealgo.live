import 'dotenv/config';

async function testModel(modelName: string) {
  const apiKey = (process.env.GOOGLE_AI_STUDIO_KEY || '').split(',')[0]?.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });
    
    console.log(`Model: ${modelName} -> Status:`, response.status, response.statusText);
    const text = await response.text();
    if (response.status !== 200) {
      console.log("Error Response:", text);
    } else {
      console.log("Success! Response text length:", text.length);
    }
  } catch (e: any) {
    console.error(`Fetch error for ${modelName}:`, e.message);
  }
}

async function runAll() {
  await testModel("gemini-2.5-flash");
  await testModel("gemini-2.5-pro");
  await testModel("gemini-2.0-flash");
  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-pro");
}

runAll();
