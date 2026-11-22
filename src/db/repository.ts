import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { rechargeRecords, savedCenters, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const safeName = (displayName || email.split('@')[0] || 'VoltPay User').slice(0, 100);
    const result = await db
      .insert(users)
      .values({
        uid,
        email: email.slice(0, 254),
        displayName: safeName,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email.slice(0, 254),
          displayName: safeName,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Unable to sync user profile right now.', { cause: error });
  }
}

export interface NewRechargeInput {
  referenceCode: string;
  carrierId: string;
  circle: string;
  phoneNumber: string;
  planTitle: string;
  amount: number;
  discount: number;
  totalPaid: number;
  promoApplied?: string;
  paymentMethod: string;
  status: string;
}

export async function recordRechargeInSql(
  uid: string,
  email: string,
  displayName: string | undefined,
  input: NewRechargeInput
) {
  try {
    const userRow = await getOrCreateUser(uid, email, displayName);
    const inserted = await db
      .insert(rechargeRecords)
      .values({
        userId: userRow.id,
        referenceCode: input.referenceCode.slice(0, 32),
        carrierId: input.carrierId.slice(0, 24),
        circle: input.circle.slice(0, 60),
        phoneNumber: input.phoneNumber.slice(0, 20),
        planTitle: input.planTitle.slice(0, 80),
        amount: Math.max(0, Math.round(input.amount)),
        discount: Math.max(0, Math.round(input.discount)),
        totalPaid: Math.max(0, Math.round(input.totalPaid)),
        promoApplied: input.promoApplied ? input.promoApplied.slice(0, 24) : null,
        paymentMethod: input.paymentMethod.slice(0, 24),
        status: input.status.slice(0, 24),
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database recharge insert failed:', error);
    throw new Error('Unable to record recharge transaction.', { cause: error });
  }
}

export async function listUserRecharges(uid: string) {
  try {
    const rows = await db
      .select({
        id: rechargeRecords.id,
        referenceCode: rechargeRecords.referenceCode,
        carrierId: rechargeRecords.carrierId,
        circle: rechargeRecords.circle,
        phoneNumber: rechargeRecords.phoneNumber,
        planTitle: rechargeRecords.planTitle,
        amount: rechargeRecords.amount,
        discount: rechargeRecords.discount,
        totalPaid: rechargeRecords.totalPaid,
        promoApplied: rechargeRecords.promoApplied,
        paymentMethod: rechargeRecords.paymentMethod,
        status: rechargeRecords.status,
        createdAt: rechargeRecords.createdAt,
      })
      .from(rechargeRecords)
      .innerJoin(users, eq(rechargeRecords.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(rechargeRecords.createdAt))
      .limit(50);
    return rows;
  } catch (error) {
    console.error('Database recharge query failed:', error);
    throw new Error('Unable to load recharge records.', { cause: error });
  }
}

export interface SaveCenterInput {
  placeId: string;
  storeName: string;
  address: string;
  carrierTag: string;
  lat?: number | null;
  lng?: number | null;
}

export async function listSavedCenters(uid: string) {
  try {
    return await db
      .select({
        id: savedCenters.id,
        placeId: savedCenters.placeId,
        storeName: savedCenters.storeName,
        address: savedCenters.address,
        carrierTag: savedCenters.carrierTag,
        lat: savedCenters.lat,
        lng: savedCenters.lng,
        createdAt: savedCenters.createdAt,
      })
      .from(savedCenters)
      .innerJoin(users, eq(savedCenters.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(savedCenters.createdAt))
      .limit(40);
  } catch (error) {
    console.error('Database saved centers list failed:', error);
    throw new Error('Unable to load bookmarked service centers.', { cause: error });
  }
}

export async function saveCenterInSql(
  uid: string,
  email: string,
  displayName: string | undefined,
  input: SaveCenterInput
) {
  try {
    const userRow = await getOrCreateUser(uid, email, displayName);
    const existing = await db
      .select()
      .from(savedCenters)
      .where(
        and(eq(savedCenters.userId, userRow.id), eq(savedCenters.placeId, input.placeId.slice(0, 128)))
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(savedCenters)
      .values({
        userId: userRow.id,
        placeId: input.placeId.slice(0, 128),
        storeName: input.storeName.slice(0, 120),
        address: input.address.slice(0, 240),
        carrierTag: input.carrierTag.slice(0, 32),
        lat: typeof input.lat === 'number' ? input.lat : null,
        lng: typeof input.lng === 'number' ? input.lng : null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database save center failed:', error);
    throw new Error('Unable to bookmark service center.', { cause: error });
  }
}

export async function removeSavedCenterInSql(uid: string, centerId: number) {
  try {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    if (userRows.length === 0) return false;

    const deleted = await db
      .delete(savedCenters)
      .where(and(eq(savedCenters.id, centerId), eq(savedCenters.userId, userRows[0].id)))
      .returning({ id: savedCenters.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database remove center failed:', error);
    throw new Error('Unable to remove bookmarked center.', { cause: error });
  }
}
