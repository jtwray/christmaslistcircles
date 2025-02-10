import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// First add email as nullable
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"), // Temporarily nullable
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  groupId: integer("group_id").notNull(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  groupId: integer("group_id").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  price: text("price"),
  description: text("description"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("available"),
  gottenBy: integer("gotten_by"),
  receipt: text("receipt"),
  isSurprise: boolean("is_surprise").default(false),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email("Invalid email format"),
});
export const insertGroupSchema = createInsertSchema(groups);
export const insertGroupMemberSchema = createInsertSchema(groupMembers);
export const insertWishlistItemSchema = createInsertSchema(wishlistItems);

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;