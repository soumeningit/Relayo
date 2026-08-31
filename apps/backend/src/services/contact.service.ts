import { prisma } from "@repo/db";
import { randomBytes } from "crypto";

function generateMessageId(): string {
  return `MSG-${randomBytes(8).toString("hex")}-${Date.now()}`;
}

export async function submitContact(input: {
  name: string;
  email: string;
  message: string;
}) {
  const contactMessage = await prisma.contactMessage.create({
    data: {
      messageId: generateMessageId(),
      name: input.name,
      email: input.email,
      message: input.message,
    },
    select: { messageId: true },
  });

  return { messageId: contactMessage.messageId };
}
