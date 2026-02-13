'use server';

import { getDatabase } from '@/lib/db';
import { createSession } from '@/lib/auth';
// Removed invalid import
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { error: 'Username and password required' };
    }

    try {
        const db = await getDatabase();

        // Find admin by username (case-insensitive)
        const admin = await db.collection('admins').findOne({
            username: { $regex: `^${username}$`, $options: 'i' },
        });

        if (!admin) {
            return { error: 'Invalid username' };
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return { error: 'Invalid password' };
        }

        // Create session token
        const token = await createSession(admin._id.toString());
        const { SESSION_DURATION } = await import('@/lib/auth');

        // Set cookie using next/headers cookies()
        const cookieStore = await cookies();
        cookieStore.set('admin-session', token, {
            httpOnly: false, // Changed to false to debug and ensure persistence
            secure: false, // Force false for local IP/HTTP testing
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_DURATION / 1000,
        });

        console.log(`Auth Action: Login successful for ${username}. Cookie set.`);
        return { success: true };
    } catch (error) {
        console.error('Login action error:', error);
        return { error: 'Internal server error' };
    }
}
