import { cookies, headers } from 'next/headers';
import { getDatabase } from './db';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(adminId: string) {
  const db = await getDatabase();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.collection('sessions').insertOne({
    adminId: new ObjectId(adminId),
    token,
    expiresAt,
    createdAt: new Date(),
  });

  console.log('Auth Debug: Created session token:', token.substring(0, 5) + '...');
  return token;
}

export async function getAdminFromSession() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const rawCookieHeader = (await headers()).get('cookie');

    console.log(`Auth Debug: [getAdminFromSession] Raw Cookie Header: ${rawCookieHeader ? 'Present' : 'Missing'}`);
    console.log('Auth Debug: All Cookies received:', allCookies.map(c => `${c.name}=${c.value.substring(0, 5)}...`).join(', '));
    const token = cookieStore.get('admin-session')?.value;

    if (!token) {
      console.log(`Auth Debug: No token found in cookies. Server Time: ${new Date().toISOString()}`);
      return null;
    }

    const db = await getDatabase();
    const session = await db.collection('sessions').findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      console.log('Auth Debug: Invalid or expired session for token:', token.substring(0, 5) + '...');
      // Optional: Log if token exists but is expired
      const expiredSession = await db.collection('sessions').findOne({ token });
      if (expiredSession) {
        console.log('Auth Debug: Session exists but expired at:', expiredSession.expiresAt);
      }
      return null;
    }

    const admin = await db.collection('admins').findOne({
      _id: session.adminId,
    });

    if (!admin) {
      console.log('Auth Debug: Session valid but admin not found for ID:', session.adminId);
      return null;
    }

    console.log('Auth Debug: Login successful for:', admin.username);
    return admin;
  } catch (error) {
    console.error('Error getting admin from session:', error);
    return null;
  }
}

export async function verifySessionDebug() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session')?.value;

    if (!token) {
      const rawHeaders = await headers();
      const cookieHeader = rawHeaders.get('cookie');
      return {
        success: false,
        error: `No session cookie. Raw header: ${cookieHeader ? 'Present' : 'Missing'}`
      };
    }

    const db = await getDatabase();
    const session = await db.collection('sessions').findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!session) return { success: false, error: 'Session invalid or expired' };

    const admin = await db.collection('admins').findOne({
      _id: session.adminId,
    });

    if (!admin) return { success: false, error: 'Admin user not found' };

    return { success: true, admin };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unknown error' };
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('admin-session');
}

export function generatePublicAccessKey() {
  return crypto.randomBytes(16).toString('hex');
}
