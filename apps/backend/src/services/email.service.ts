import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: process.env.MAIL_PORT === "465",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

const MAIL_FROM =
  process.env.MAIL_FROM || `"Relayo Support" <${process.env.MAIL_USERNAME}>`;

const getTemplate = async (templateName: string) => {
  const filePath = path.resolve(process.cwd(), "src/templates", templateName);
  return await fs.readFile(filePath, "utf-8");
};

// 1. Send Verification OTP Email
export async function sendVerificationEmail(
  to: string,
  name: string,
  url: string,
  time: string,
) {
  try {
    let html = await getTemplate("verification.html");
    html = html
      .replace("{{name}}", name)
      .replace(/{{url}}/g, url)
      .replace("{{time}}", time);

    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: "Verify your Relayo Account",
      html,
    });
    console.log(
      `[Email Service]: Verification email successfully dispatched to ${to}`,
    );
  } catch (error) {
    console.error(
      `[Email Service Error]: Failed to dispatch verification email to ${to}`,
      error,
    );
    throw new Error("Failed to dispatch verification email");
  }
}

// 2. Send Password Reset Email
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
) {
  try {
    let html = await getTemplate("reset-password.html");
    html = html.replace("{{name}}", name).replace("{{resetUrl}}", resetUrl);

    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: "Reset your Relayo Password",
      html,
    });
    console.log(
      `[Email Service]: Password reset email successfully dispatched to ${to}`,
    );
  } catch (error) {
    console.error(
      `[Email Service Error]: Failed to dispatch password reset email to ${to}`,
      error,
    );
    throw new Error("Failed to dispatch password reset email");
  }
}

export async function sendInvitationEmail(
  to: string,
  name: string,
  inviterName: string,
  orgName: string,
  role: string,
  url: string,
  expiryDate: string,
) {
  try {
    let html = await getTemplate("invitation.html");
    html = html
      .replace(/{{name}}/g, name)
      .replace(/{{inviterName}}/g, inviterName)
      .replace(/{{orgName}}/g, orgName)
      .replace(/{{role}}/g, role)
      .replace(/{{url}}/g, url)
      .replace(/{{expiryDate}}/g, expiryDate);

    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject: `Invitation to join ${orgName} on Relayo`,
      html,
    });
    console.log(
      `[Email Service]: Invitation email successfully dispatched to ${to}`,
    );
  } catch (error) {
    console.error(
      `[Email Service Error]: Failed to dispatch invitation email to ${to}`,
      error,
    );
    throw new Error("Failed to dispatch invitation email");
  }
}
