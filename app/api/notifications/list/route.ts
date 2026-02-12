import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAdminFromSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const notifications = await db
      .collection('notifications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Count unread
    const unreadCount = await db
      .collection('notifications')
      .countDocuments({ read: false });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
