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
    const payments = await db
      .collection('payments')
      .aggregate([
        {
          $lookup: {
            from: 'rentals',
            localField: 'rentalId',
            foreignField: '_id',
            as: 'rental',
          },
        },
        {
          $unwind: '$rental',
        },
        {
          $lookup: {
            from: 'tvs',
            localField: 'rental.tvId',
            foreignField: '_id',
            as: 'tv',
          },
        },
        {
          $unwind: '$tv',
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
