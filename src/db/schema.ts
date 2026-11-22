import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('VoltPay User'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rechargeRecords = pgTable('recharge_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  referenceCode: text('reference_code').notNull(),
  carrierId: text('carrier_id').notNull(),
  circle: text('circle').notNull(),
  phoneNumber: text('phone_number').notNull(),
  planTitle: text('plan_title').notNull(),
  amount: integer('amount').notNull(),
  discount: integer('discount').notNull().default(0),
  totalPaid: integer('total_paid').notNull(),
  promoApplied: text('promo_applied'),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('Success'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedCenters = pgTable('saved_centers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  placeId: text('place_id').notNull(),
  storeName: text('store_name').notNull(),
  address: text('address').notNull(),
  carrierTag: text('carrier_tag').notNull().default('Telecom'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  recharges: many(rechargeRecords),
  savedCenters: many(savedCenters),
}));

export const rechargeRecordsRelations = relations(rechargeRecords, ({ one }) => ({
  user: one(users, {
    fields: [rechargeRecords.userId],
    references: [users.id],
  }),
}));

export const savedCentersRelations = relations(savedCenters, ({ one }) => ({
  user: one(users, {
    fields: [savedCenters.userId],
    references: [users.id],
  }),
}));
