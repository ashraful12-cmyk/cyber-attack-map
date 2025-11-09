// backend/services/threatFeeds.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function aggregateFeeds() {
  const key = process.env.ABUSEIPDB_KEY;
  if (!key) throw new Error("ABUSEIPDB_KEY missing in .env");

  const url = "https://api.abuseipdb.com/api/v2/blacklist";
  const res = await axios.get(url, {
    headers: {
      Key: key,
      Accept: "application/json",
    },
    timeout: 15000,
  });

  return res.data.data || [];
}
