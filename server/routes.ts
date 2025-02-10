import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertGroupSchema, insertWishlistItemSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendEmail } from "./email";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Groups
  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const data = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(data);
      await storage.addUserToGroup({ userId: req.user!.id, groupId: group.id });
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/groups", requireAuth, async (req, res) => {
    const groups = await storage.getGroupsForUser(req.user!.id);
    res.json(groups);
  });

  app.post("/api/groups/:groupId/members", requireAuth, async (req, res) => {
    try {
      const { username } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const group = await storage.getGroup(parseInt(req.params.groupId));
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      await storage.addUserToGroup({
        userId: user.id,
        groupId: parseInt(req.params.groupId)
      });

      // Send email notification to the new member
      await sendEmail("newGroupMember", {
        user,
        group,
        actorName: req.user!.username
      });

      res.status(201).json({ message: "Member added" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Wishlist items
  app.post("/api/groups/:groupId/wishlist", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const data = insertWishlistItemSchema.parse({
        ...req.body,
        userId: req.user!.id,
        groupId
      });
      const item = await storage.createWishlistItem(data);

      // Get group info and members for notifications
      const group = await storage.getGroup(groupId);
      const members = await storage.getGroupMembers(groupId);

      // Notify other group members about the new item
      if (!data.isSurprise) {
        for (const member of members) {
          if (member.userId !== req.user!.id) {
            const user = await storage.getUser(member.userId);
            if (user) {
              await sendEmail("newWishlistItem", {
                user,
                group,
                item,
                actorName: req.user!.username
              });
            }
          }
        }
      }

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(error);
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/groups/:groupId/wishlist/:userId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);

      if (isNaN(groupId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid group or user ID" });
      }

      const items = await storage.getWishlistItems(userId, groupId);

      // Hide status and gottenBy if viewing own wishlist
      const sanitizedItems = items.map(item => {
        if (item.userId === req.user!.id) {
          const { status, gottenBy, receipt, ...rest } = item;
          return rest;
        }
        return item;
      });

      res.json(sanitizedItems);
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/wishlist/:itemId", requireAuth, async (req, res) => {
    try {
      const { receipt, status } = req.body;
      const item = await storage.getWishlistItem(parseInt(req.params.itemId));

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      const updatedItem = await storage.updateWishlistItem(item.id, {
        status,
        gottenBy: req.user!.id,
        receipt
      });

      // Send email notification to item owner
      const itemOwner = await storage.getUser(item.userId);
      const group = await storage.getGroup(item.groupId);

      if (itemOwner) {
        await sendEmail("itemGotten", {
          user: itemOwner,
          group,
          item: updatedItem
        });
      }

      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}