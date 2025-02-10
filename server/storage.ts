import { users, groups, groupMembers, wishlistItems } from "@shared/schema";
import type { User, Group, GroupMember, WishlistItem, InsertUser, InsertGroup, InsertGroupMember, InsertWishlistItem } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  updateGroup(id: number, name: string): Promise<Group>;
  getGroupsForUser(userId: number): Promise<Group[]>;

  // Group member operations
  addUserToGroup(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;

  // Wishlist operations
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  getWishlistItems(userId: number, groupId: number): Promise<WishlistItem[]>;
  updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem>;
  getWishlistItem(id: number): Promise<WishlistItem | undefined>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async updateGroup(id: number, name: string): Promise<Group> {
    const [updatedGroup] = await db
      .update(groups)
      .set({ name })
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup;
  }

  async getGroupsForUser(userId: number): Promise<Group[]> {
    const members = await db
      .select({
        group: groups,
      })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId))
      .innerJoin(groups, eq(groups.id, groupMembers.groupId));

    return members.map(m => m.group);
  }

  async addUserToGroup(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem> {
    const [newItem] = await db.insert(wishlistItems).values(item).returning();
    return newItem;
  }

  async getWishlistItems(userId: number, groupId: number): Promise<WishlistItem[]> {
    return await db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, userId),
          eq(wishlistItems.groupId, groupId)
        )
      );
  }

  async updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem> {
    const [updatedItem] = await db
      .update(wishlistItems)
      .set(updates)
      .where(eq(wishlistItems.id, id))
      .returning();
    return updatedItem;
  }

  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const [item] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, id));
    return item;
  }
}

export const storage = new DatabaseStorage();