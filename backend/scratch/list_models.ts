import 'dotenv/config';

async function listModels() {
  const apiKey = (process.env.GOOGLE_AI_STUDIO_KEY || '').split(',')[0]?.trim();
  if (!apiKey) {
    console.error("No API key found in GOOGLE_AI_STUDIO_KEY");
    process.exit(1);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const response = await fetch(url);
    const result: any = await response.json();
    console.log("Available models:");
    if (result.models) {
      result.models.forEach((m: any) => console.log(`- ${m.name}`));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (e: any) {
    console.error("Error listing models:", e.message);
  }
}

listModels();
