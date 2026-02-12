import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tvId } = await req.json();

    if (!tvId) {
      return NextResponse.json(
        { error: 'TV ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const tvCollection = db?.collection('tvs');
    const rentalCollection = db?.collection('rentals');

    // Check if TV has active rentals
    const activeRental = await rentalCollection?.findOne({
      tvId: new ObjectId(tvId),
      status: 'active',
    });

    if (activeRental) {
      return NextResponse.json(
        { error: 'Cannot delete TV with active rental' },
        { status: 400 }
      );
    }

    const result = await tvCollection?.deleteOne({
      _id: new ObjectId(tvId),
    });

    if (result?.deletedCount === 0) {
      return NextResponse.json({ error: 'TV not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'TV deleted successfully',
    });
  } catch (error) {
    console.error('Delete TV error:', error);
    return NextResponse.json(
      { error: 'Failed to delete TV' },
      { status: 500 }
    );
  }
}
