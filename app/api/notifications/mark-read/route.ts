import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAdminFromSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface MarkReadRequest {
  notificationId?: string;
  markAllRead?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, markAllRead } = (await request.json()) as MarkReadRequest;

    const db = await getDatabase();

    if (markAllRead) {
      await db
        .collection('notifications')
        .updateMany({ read: false }, { $set: { read: true } });
    } else if (notificationId) {
      await db
        .collection('notifications')
        .updateOne(
          { _id: new ObjectId(notificationId) },
          { $set: { read: true } }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
