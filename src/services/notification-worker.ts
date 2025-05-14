import { prisma } from "~/server/db";

// API Configuration
const API_KEY = process.env.TELEGRAM_API_KEY || "";
const API_URL = process.env.TELEGRAM_API_URL || "";

// Validate API configuration
if (!API_KEY || !API_URL) {
  console.error("API_KEY and API_URL environment variables are required");
}

// Helper to extract cabinet ID from message
function extractCabinetId(message: string): string | null {
  const match = message.match(/\[(.*?)#(.*?)\]/);
  return match ? match[2] : null;
}

// Helper to extract cabinet name from message
function extractCabinetName(message: string): string | null {
  const match = message.match(/\[(.*?)#(.*?)\]/);
  return match ? match[1] : null;
}

/**
 * Fetch cabinet messages from the API
 * @param hours Number of hours to look back for messages
 */
async function fetchCabinetMessages(hours = 3) {
  try {
    const response = await fetch(`${API_URL}/messages/recent?hours=${hours}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error("Error fetching cabinet messages:", error);
    return [];
  }
}

/**
 * Save messages to database and route them to appropriate users
 */
export async function processAndSaveMessages() {
  try {
    const messages = await fetchCabinetMessages();
    if (!messages.length) return { processed: 0 };

    console.log(`Processing ${messages.length} new cabinet messages`);

    // Get all active work sessions with assigned cabinets
    const activeSessions = await prisma.workSession.findMany({
      where: {
        endTime: null,
      },
      include: {
        user: true,
        idexCabinets: {
          include: {
            idexCabinet: true,
          },
        },
      },
    });

    // Store saved count for reporting
    let processedCount = 0;

    for (const message of messages) {
      const cabinetId = extractCabinetId(message.message);
      const cabinetName = extractCabinetName(message.message);

      if (!cabinetId || !cabinetName) continue;

      try {
        // Look up the cabinet ID in our database
        const cabinet = await prisma.idexCabinet.findFirst({
          where: {
            idexId: parseInt(cabinetId),
          },
        });

        // Save the message to database
        const savedNotification = await prisma.cabinetNotification.create({
          data: {
            chat_id: message.chat_id,
            chat_name: message.chat_name,
            cabinet_id: cabinetId,
            cabinet_name: cabinetName,
            message: message.message,
            timestamp: new Date(message.timestamp * 1000),
            cabinetId: cabinet?.id, // Link to our cabinet if found
          },
        });

        // Find users who are working with this cabinet and link notification to them
        const usersWithCabinet = activeSessions
          .filter((session) =>
            session.idexCabinets.some(
              (c) => c.idexCabinet.idexId === parseInt(cabinetId),
            ),
          )
          .map((session) => session.user);

        // If we have users for this cabinet, link the notification to them
        if (usersWithCabinet.length > 0) {
          for (const user of usersWithCabinet) {
            await prisma.cabinetNotification.update({
              where: { id: savedNotification.id },
              data: {
                userId: user.id,
              },
            });
          }
        }

        processedCount++;
      } catch (error) {
        console.error(
          `Error processing message for cabinet ${cabinetId}:`,
          error,
        );
      }
    }

    return { processed: processedCount };
  } catch (error) {
    console.error("Error in processAndSaveMessages:", error);
    return { error: String(error), processed: 0 };
  }
}

// When running as a separate process, this will execute the job
if (require.main === module) {
  processAndSaveMessages()
    .then((result) => {
      console.log("Notification processing complete:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error running notification worker:", error);
      process.exit(1);
    });
}
