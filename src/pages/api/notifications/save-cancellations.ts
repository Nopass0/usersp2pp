import type { NextApiRequest, NextApiResponse } from 'next';
import { db as prisma } from '~/server/db';

type CancellationMessage = {
  chat_id: number;
  chat_name: string;
  message: string;
  timestamp: number;
  message_id: string | number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cancellations } = req.body;

    if (!cancellations || !Array.isArray(cancellations) || cancellations.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty cancellations array' });
    }

    // Process each cancellation message
    const results = await Promise.all(
      cancellations.map(async (cancellation: CancellationMessage) => {
        const { chat_id, chat_name, message, timestamp, message_id } = cancellation;

        // Check if this notification already exists by chat_id + message_id
        const existingCancellation = await prisma.cancellation.findFirst({
          where: {
            chatId: BigInt(chat_id),
            messageId: message_id.toString(),
          },
        });

        // Skip if already exists
        if (existingCancellation) {
          return {
            status: 'skipped',
            id: existingCancellation.id,
            message: 'Cancellation already exists',
          };
        }

        // Otherwise create a new cancellation notification
        const newCancellation = await prisma.cancellation.create({
          data: {
            chatId: BigInt(chat_id),
            chatName: chat_name,
            message: message,
            messageId: message_id.toString(),
            timestamp: new Date(timestamp * 1000), // Convert UNIX timestamp to Date
            isRead: false,
          },
        });

        return {
          status: 'created',
          id: newCancellation.id,
        };
      })
    );

    // Return results
    return res.status(200).json({
      success: true,
      processed: results.length,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    });
  } catch (error) {
    console.error('Error saving cancellations:', error);
    return res.status(500).json({ 
      error: 'Error processing cancellations',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}