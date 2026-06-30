import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkPinecone() {
  console.log("Checking Pinecone configuration...");
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  
  try {
    // List indexes
    const indexes = await pinecone.listIndexes();
    console.log("\nAvailable indexes:", indexes);
    
    // Check if our index exists
    const indexName = "permitiq";
    const indexExists = indexes.indexes?.some((idx: any) => idx.name === indexName);
    
    if (!indexExists) {
      console.log(`\n✗ Index "${indexName}" does not exist!`);
      console.log("You need to create it first.");
      return;
    }
    
    console.log(`\n✓ Index "${indexName}" exists`);
    
    // Get index stats
    const index = pinecone.Index(indexName);
    const stats = await index.describeIndexStats();
    console.log("\nIndex stats:", JSON.stringify(stats, null, 2));
    
  } catch (error: any) {
    console.error("Error:", error.message);
    console.error("Details:", error);
  }
}

checkPinecone();
