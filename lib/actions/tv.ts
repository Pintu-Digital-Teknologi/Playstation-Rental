'use server';

import { publishTVAction } from '@/lib/mqtt';
import { getDatabase } from '@/lib/db';
import { getAdminFromSession, verifySessionDebug } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { TVUnit } from '@/lib/types';
import { sendCommandToTV, getTVStatus } from '@/lib/tv-control';

// --- Get TVs Action ---
export async function getTVsAction() {
    try {
        const admin = await getAdminFromSession();
        if (!admin) {
            return { error: 'Unauthorized' };
        }

        const db = await getDatabase();
        const tvs = await db.collection<TVUnit>('tvs').find({}).toArray();

        // Enrich with current rental info and check for expiration
        // Use Promise.all to handle async status checks
        const enrichedTvs = await Promise.all(
            tvs.map(async (tv) => {
                let currentRental = null;

                // 1. Use Status from DB (Synced by Bridge)
                let isOnline = tv.isOnline;
                let isReachable = tv.isReachable;

                // Liveness Check: If bridge hasn't synced in > 30s, assume offline
                if (tv.lastChecked) {
                    const lastCheckedTime = new Date(tv.lastChecked).getTime();
                    const now = new Date().getTime();
                    if (now - lastCheckedTime > 30000) { // 30 seconds threshold
                        isOnline = false;
                        isReachable = false;
                    }
                } else {
                    // New TV or never checked
                    isOnline = false;
                    isReachable = false;
                }

                // Skip VPS-side ADB check (Bridge handles this)
                // try {
                //     const tvStatus = await getTVStatus(tv.ipAddress);
                // } catch (e) {
                //     console.error(`Failed to check status for ${tv.name}:`, e);
                // }

                // 2. Check active rental
                if (tv.currentRentalId) {
                    currentRental = await db.collection('rentals').findOne({ _id: tv.currentRentalId });

                    if (currentRental && currentRental.status === 'active' && currentRental.startTime) {
                        const now = new Date();
                        const startTime = new Date(currentRental.startTime);

                        if (currentRental.type === 'regular') {
                            const elapsedMs = now.getTime() - startTime.getTime();
                            currentRental = {
                                ...currentRental,
                                elapsedMs,
                                remainingMs: null,
                                endTime: null,
                            };
                        } else if (currentRental.durationMs) {
                            const endTime = new Date(startTime.getTime() + currentRental.durationMs);

                            if (now > endTime) {
                                // Rental Expired Logic
                                await db.collection('rentals').updateOne(
                                    { _id: new ObjectId(currentRental._id) },
                                    { $set: { status: 'completed', endTime, updatedAt: new Date() } }
                                );

                                await db.collection('tvs').updateOne(
                                    { _id: tv._id },
                                    {
                                        $set: { status: 'available', lastChecked: new Date() },
                                        $unset: { currentRentalId: '', timerId: '' },
                                    }
                                );

                                // Attempt power off via MQTT if online
                                if (isOnline) {
                                    publishTVAction(tv.ipAddress, 'POWER_OFF').catch(err =>
                                        console.error(`Failed to auto-power off ${tv.name}:`, err)
                                    );
                                }

                                return {
                                    ...tv,
                                    _id: tv._id.toString(),
                                    status: 'available',
                                    isOnline,
                                    isReachable,
                                    currentRental: null,
                                };
                            } else {
                                // Active Hourly Rental
                                const remainingMs = endTime.getTime() - now.getTime();
                                currentRental = {
                                    ...currentRental,
                                    remainingMs,
                                    endTime,
                                };
                            }
                        }
                    }
                }

                // Serialization
                return {
                    ...tv,
                    _id: tv._id.toString(),
                    currentRentalId: tv.currentRentalId?.toString(),
                    currentRental: currentRental ? {
                        ...currentRental,
                        _id: currentRental._id.toString(),
                        tvId: currentRental.tvId?.toString(),
                    } : null,
                    isOnline,
                    isReachable,
                };
            })
        );

        return { tvs: enrichedTvs };
    } catch (error) {
        console.error('getTVsAction error:', error);
        return { error: 'Failed to fetch TVs' };
    }
}

// --- Create TV Action ---
export async function createTVAction(formData: FormData) {
    try {
        const authResult = await verifySessionDebug();
        if (!authResult.success) {
            console.error(`createTVAction Unauthorized: ${authResult.error}`);
            return { error: `Unauthorized: ${authResult.error}` };
        }
        const admin = authResult.admin;

        const name = formData.get('name') as string;
        const ipAddress = formData.get('ipAddress') as string;
        const pricePerHour = formData.get('pricePerHour') ? Number(formData.get('pricePerHour')) : undefined;

        // Basic validations
        if (!name || !ipAddress) return { error: 'Name and IP required' };

        const db = await getDatabase();

        // Check duplication
        const existing = await db.collection('tvs').findOne({ ipAddress });
        if (existing) return { error: 'IP Address already in use' };

        const newTV = {
            name,
            ipAddress,
            pricePerHour,
            status: 'available',
            isOnline: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('tvs').insertOne(newTV);
        revalidatePath('/admin/ip-management');
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error) {
        console.error('createTVAction error:', error);
        return { error: 'Failed to create TV' };
    }
}

// --- Delete TV Action ---
export async function deleteTVAction(tvId: string) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) return { error: 'Unauthorized' };

        const db = await getDatabase();
        await db.collection('tvs').deleteOne({ _id: new ObjectId(tvId) });

        revalidatePath('/admin/ip-management');
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error) {
        console.error('deleteTVAction error:', error);
        return { error: 'Failed to delete TV' };
    }
}

// --- TV Control Action ---
export async function controlTVAction(tvId: string, action: string, extraData?: any) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) return { error: 'Unauthorized' };

        const db = await getDatabase();
        const tv = await db.collection('tvs').findOne({ _id: new ObjectId(tvId) });

        if (!tv) return { error: 'TV not found' };

        // Handle specific actions using MQTT
        let command = '';
        switch (action) {
            case 'power-on': command = 'POWER_ON'; break;
            case 'power-off': command = 'POWER_OFF'; break;
            case 'volume-up': command = 'VOLUME_UP'; break;
            case 'volume-down': command = 'VOLUME_DOWN'; break;
            case 'back': command = 'BACK'; break;
            case 'home': command = 'HOME'; break;
        }

        if (command) {
            // Use MQTT to publish command to bridge
            await publishTVAction(tv.ipAddress, command as any);
        }

        // Special handling for timer setting in DB if needed (omitted for brevity unless requested)

        revalidatePath('/admin/dashboard'); // Updates status on UI
        return { success: true, message: `Command ${action} sent` };
    } catch (error) {
        console.error('controlTVAction error:', error);
        return { error: 'Failed to execute command' };
    }
}

// --- Update TV Action ---
export async function updateTVAction(tvId: string, formData: FormData) {
    try {
        const authResult = await verifySessionDebug();
        if (!authResult.success) {
            console.error(`updateTVAction Unauthorized: ${authResult.error}`);
            return { error: `Unauthorized: ${authResult.error}` };
        }
        const admin = authResult.admin;

        const name = formData.get('name') as string;
        const ipAddress = formData.get('ipAddress') as string;
        const pricePerHour = formData.get('pricePerHour') ? Number(formData.get('pricePerHour')) : undefined;
        const macAddress = formData.get('macAddress') as string;
        const description = formData.get('description') as string;

        if (!name || !ipAddress) return { error: 'Name and IP required' };

        const db = await getDatabase();

        // Check duplication (exclude current TV)
        const existing = await db.collection('tvs').findOne({
            ipAddress,
            _id: { $ne: new ObjectId(tvId) }
        });
        if (existing) return { error: 'IP Address already in use' };

        await db.collection('tvs').updateOne(
            { _id: new ObjectId(tvId) },
            {
                $set: {
                    name,
                    ipAddress,
                    macAddress,
                    description,
                    pricePerHour,
                    updatedAt: new Date(),
                }
            }
        );

        revalidatePath('/admin/ip-management');
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error) {
        console.error('updateTVAction error:', error);
        return { error: 'Failed to update TV' };
    }
}
