import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

interface CreateNotificationRequest {
  rentalId: string;
  tvId: string;
  type: 'time-warning' | 'time-up' | 'payment-due' | 'system';
  message: string;
}

// This is an internal API - should be protected with API key in production
export async function POST(request: NextRequest) {
  try {
    // In production, verify API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    const {
      rentalId,
      tvId,
      type,
      message,
    } = (await request.json()) as CreateNotificationRequest;

    if (!rentalId || !tvId || !type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection('notifications').insertOne({
      rentalId: new ObjectId(rentalId),
      tvId: new ObjectId(tvId),
      type,
      message,
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      notificationId: result.insertedId,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
