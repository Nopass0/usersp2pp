import { NextApiRequest, NextApiResponse } from "next";
import { processAndSaveMessages } from "~/services/notification-worker";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint is intended to be called by a scheduler/cron job
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Optional: Add some basic auth or API key validation
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await processAndSaveMessages();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing notifications:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}