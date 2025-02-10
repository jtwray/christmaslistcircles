import nodemailer from "nodemailer";
import { User, Group, WishlistItem } from "@shared/schema";

// Create transporter once
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export type EmailTemplate = 
  | "newGroupMember"
  | "newWishlistItem"
  | "itemGotten"
  | "surpriseGift";

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

function getEmailTemplate(
  template: EmailTemplate,
  data: {
    user: User;
    group?: Group;
    item?: WishlistItem;
    actorName?: string;
  }
): EmailData {
  const { user, group, item, actorName } = data;

  switch (template) {
    case "newGroupMember":
      return {
        to: user.email,
        subject: `New Member in ${group!.name}`,
        html: `
          <h2>Welcome to ${group!.name}!</h2>
          <p>${actorName} has added you to the group.</p>
          <p>You can now share your Christmas wishlist and view others' wishlists.</p>
        `,
      };

    case "newWishlistItem":
      return {
        to: user.email,
        subject: `New Item in ${group!.name}`,
        html: `
          <h2>New Wishlist Item</h2>
          <p>${actorName} has added a new item to their wishlist in ${group!.name}:</p>
          <p><strong>${item!.name}</strong></p>
          ${item!.price ? `<p>Price: ${item!.price}</p>` : ""}
        `,
      };

    case "itemGotten":
      return {
        to: user.email,
        subject: "Item Marked as Purchased",
        html: `
          <h2>Item Purchased</h2>
          <p>Someone has marked an item as purchased from your wishlist in ${group!.name}.</p>
          <p>Remember, don't check your wishlist if you want to keep the surprise!</p>
        `,
      };

    case "surpriseGift":
      return {
        to: user.email,
        subject: "Surprise Gift Added",
        html: `
          <h2>Surprise Gift Added</h2>
          <p>Someone has added a surprise gift to your wishlist in ${group!.name}!</p>
          <p>The details are hidden to keep the surprise.</p>
        `,
      };

    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

export async function sendEmail(
  template: EmailTemplate,
  data: {
    user: User;
    group?: Group;
    item?: WishlistItem;
    actorName?: string;
  }
) {
  try {
    const emailData = getEmailTemplate(template, data);
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      ...emailData,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}