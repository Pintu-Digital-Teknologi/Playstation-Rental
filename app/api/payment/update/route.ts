import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getAdminFromSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface UpdatePaymentRequest {
  paymentId: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, status, notes } = (await request.json()) as UpdatePaymentRequest;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'paid') {
      updateData.paidDate = new Date();
    }

    const result = await db.collection('payments').updateOne(
      { _id: new ObjectId(paymentId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
