'use server';

import { getDatabase } from '@/lib/db';
import { getAdminFromSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function getNotificationsAction() {
    try {
        const admin = await getAdminFromSession();
        if (!admin) return { error: 'Unauthorized' };

        const db = await getDatabase();
        const notifications = await db
            .collection('notifications')
            .find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        const unreadCount = await db
            .collection('notifications')
            .countDocuments({ read: false });

        // Serialize ObjectIds
        const serializedNotifications = notifications.map(n => ({
            ...n,
            _id: n._id.toString(),
            createdAt: n.createdAt.toString(), // Ensure date is string if needed, or keep as is if client handles it. 
            // Based on popover usage: `new Date(date)` so string or Date object works. 
            // MongoDB driver returns Date objects. Server Actions support Date objects in modern Next.js, 
            // but let's be safe and toString() if it's an issue. 
            // Actually, let's keep it simple first.
        }));

        return {
            notifications: JSON.parse(JSON.stringify(serializedNotifications)),
            unreadCount
        };
    } catch (error) {
        console.error('getNotificationsAction error:', error);
        return { error: 'Failed to fetch notifications' };
    }
}

export async function markReadAction(notificationId?: string, markAll: boolean = false) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) {
            return { error: 'Unauthorized' };
        }

        const db = await getDatabase();

        if (markAll) {
            await db.collection('notifications').updateMany(
                { read: false },
                { $set: { read: true } }
            );
        } else if (notificationId) {
            await db.collection('notifications').updateOne(
                { _id: new ObjectId(notificationId) },
                { $set: { read: true } }
            );
        }

        return { success: true };
    } catch (error) {
        console.error('markReadAction error:', error);
        return { error: 'Failed to mark as read' };
    }
}
