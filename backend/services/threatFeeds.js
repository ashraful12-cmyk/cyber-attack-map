// backend/services/threatFeeds.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Fetch and aggregate threat feed data from AbuseIPDB.
 * This module works perfectly with ES modules (Render-ready).
 */
export async function aggregateFeeds() {
  const key = process.env.ABUSEIPDB_KEY;
  if (!key) throw new Error("❌ ABUSEIPDB_KEY missing in .env");

  const url = "https://api.abuseipdb.com/api/v2/blacklist";

  try {
    const res = await axios.get(url, {
      headers: {
        Key: key,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const data = res.data?.data || [];
    console.log(`✅ Fetched ${data.length} records from AbuseIPDB`);
    return data;
  } catch (error) {
    console.error("❌ Error fetching AbuseIPDB feed:", error.message);
    return [];
  }
}
