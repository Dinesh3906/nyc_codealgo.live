import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function createIndex() {
  console.log("Creating Pinecone index for NYC Building Code...");
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  const indexName = "nyc-code-compliance";
  
  try {
    // Check if index already exists
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((idx: any) => idx.name === indexName);
    
    if (indexExists) {
      console.log(`✓ Index "${indexName}" already exists!`);
      return;
    }
    
    console.log(`Creating index "${indexName}"...`);
    console.log("Configuration:");
    console.log("  - Dimension: 384 (Xenova/all-MiniLM-L6-v2)");
    console.log("  - Metric: cosine");
    console.log("  - Cloud: AWS");
    console.log("  - Region: us-east-1");
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 384, // Xenova/all-MiniLM-L6-v2 produces 384-dimensional vectors
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log("\n✓ Index created successfully!");
    console.log("Waiting for index to be ready...");
    
    // Wait for index to be ready
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const indexes = await pinecone.listIndexes();
      const index = indexes.indexes?.find((idx: any) => idx.name === indexName);
      ready = index?.status?.ready === true;
      attempts++;
      console.log(`  Checking... (attempt ${attempts}/30)`);
    }
    
    if (ready) {
      console.log("\n✓ Index is ready! You can now run the ingestion script.");
    } else {
      console.log("\n⚠ Index creation is taking longer than expected. Check Pinecone dashboard.");
    }
    
  } catch (error: any) {
    console.error("\n✗ Error creating index:", error.message);
    console.error("Details:", error);
  }
}

createIndex();
