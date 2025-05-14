import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";

// Define message structure from the request
interface CabinetMessage {
  chat_id: number;
  chat_name: string;
  cabinet_name: string;
  cabinet_id: string;
  message: string;
  timestamp: number;
  message_id: string | number; // Can be either string or number
}

// Simple auth check function - for now, just return true
// In a real environment, you would validate the auth token
async function checkAuth(_req: NextApiRequest): Promise<boolean> {
  // Simplified auth that always returns true for this API
  // This is only for development purposes
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Check authentication
  const isAuthenticated = await checkAuth(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get messages from request body
    const { messages } = req.body as { messages: CabinetMessage[] };
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }
    
    // Process messages in bulk
    const results = await Promise.all(
      messages.map(async (message) => {
        try {
          // Skip checking for existing messages temporarily until schema is updated
          // Get message_id as string for uniformity
          const messageIdStr = message.message_id.toString();
          
          // Look up the cabinet
          const cabinet = await db.idexCabinet.findFirst({
            where: {
              idexId: parseInt(message.cabinet_id),
            },
          });
          
          // Find active work sessions that include this cabinet
          const activeWorkSessions = await db.workSession.findMany({
            where: {
              endTime: null,
              idexCabinets: {
                some: {
                  idexCabinet: {
                    idexId: parseInt(message.cabinet_id),
                  },
                },
              },
            },
            include: {
              user: true,
            },
          });
          
          // Temporary: try to create notification using the old message_id field
          // If it fails, we'll catch the error and continue 
          try {
            // Generate a unique BigInt ID based on message_id or timestamp
            let notificationId: bigint;

            try {
              // Try to use the message_id directly as a BigInt if it's numeric
              if (typeof message.message_id === 'number' ||
                 (typeof message.message_id === 'string' && /^\d+$/.test(message.message_id))) {
                notificationId = BigInt(message.message_id);
              } else {
                // Otherwise generate an ID using timestamp and random number
                notificationId = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
              }
            } catch (e) {
              // Fallback if conversion fails
              notificationId = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
            }

            const notification = await db.cabinetNotification.create({
              data: {
                id: notificationId, // Use explicit BigInt ID
                chat_id: Math.abs(parseInt(messageIdStr) % 2147483647), // Use hash value within INT4 range
                chat_name: message.chat_name + ` (${message.chat_id})`, // Store original chat_id in name
                cabinet_name: message.cabinet_name,
                cabinet_id: message.cabinet_id,
                message: message.message,
                timestamp: new Date(message.timestamp * 1000),
                message_id_str: messageIdStr,
                cabinetId: cabinet?.id || null,
              },
            });
            
            // Link notification to users with active sessions
            if (activeWorkSessions.length > 0) {
              for (const session of activeWorkSessions) {
                await db.cabinetNotification.update({
                  where: { id: notification.id },
                  data: { userId: session.user.id },
                });
              }
              
              return { 
                status: "saved_with_users", 
                message_id: message.message_id,
                users: activeWorkSessions.map(s => s.user.name)
              };
            }
            
            return { status: "saved", message_id: message.message_id };
          } catch (createError) {
            // If creation fails because of schema issues, just log and return success anyway
            console.warn(`Notification creation error: ${createError instanceof Error ? createError.message : 'Unknown'}`);
            return { 
              status: "not_saved",
              message_id: message.message_id,
              error: "Database schema issue - notification not saved but message processed"
            };
          }
        } catch (error) {
          console.error(`Error processing message ${message.message_id}:`, error);
          return { 
            status: "error", 
            message_id: message.message_id, 
            error: error instanceof Error ? error.message : "Unknown error" 
          };
        }
      })
    );
    
    return res.status(200).json({ results });
  } catch (error) {
    console.error("Error processing messages:", error);
    return res.status(500).json({ 
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error processing messages"
    });
  }
}