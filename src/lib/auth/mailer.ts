import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import nodemailer from "nodemailer";

const devMailDumpDir = process.env.MAIL_DEV_DUMP_DIR?.trim() || path.join(os.tmpdir(), "militia-dev-mail");
const fallbackMailPath = path.join(devMailDumpDir, "last-verification-email.json");

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      }),
      mode: "smtp" as const,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    }),
    mode: "dev" as const,
  };
}

export async function sendVerificationEmail(input: {
  email: string;
  username: string;
  verificationUrl: string;
}) {
  const from = process.env.SMTP_FROM ?? "Militia <no-reply@militia.local>";
  const { transporter, mode } = createTransport();

  const info = await transporter.sendMail({
    from,
    to: input.email,
    subject: "Potwierdz swoj adres email",
    text: `Czesc ${input.username},\n\nPotwierdz swoj adres email klikajac w link:\n${input.verificationUrl}\n\nLink wygasa za 24 godziny.`,
    html: `<p>Czesc <strong>${input.username}</strong>,</p><p>Potwierdz swoj adres email klikajac w link ponizej:</p><p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p><p>Link wygasa za 24 godziny.</p>`,
  });

  if (mode === "dev") {
    const previewMessage = "message" in info ? String(info.message) : "Preview unavailable";
    await mkdir(path.dirname(fallbackMailPath), { recursive: true });
    await writeFile(
      fallbackMailPath,
      JSON.stringify(
        {
          email: input.email,
          username: input.username,
          verificationUrl: input.verificationUrl,
          preview: previewMessage,
        },
        null,
        2,
      ),
      "utf8",
    );

    return {
      mode,
      previewFile: fallbackMailPath,
      verificationUrl: input.verificationUrl,
    };
  }

  return {
    mode,
    messageId: info.messageId,
  };
}

export async function sendPasswordResetEmail(input: {
  email: string;
  username: string;
  resetUrl: string;
}) {
  const from = process.env.SMTP_FROM ?? "Militia <no-reply@militia.local>";
  const { transporter, mode } = createTransport();

  const info = await transporter.sendMail({
    from,
    to: input.email,
    subject: "Reset hasla Militia",
    text: `Czesc ${input.username},\n\nOtrzymalismy prosbe o reset hasla. Kliknij w link:\n${input.resetUrl}\n\nJesli to nie Ty, zignoruj ta wiadomosc. Link wygasa za 30 minut.`,
    html: `<p>Czesc <strong>${input.username}</strong>,</p><p>Otrzymalismy prosbe o reset hasla. Kliknij ponizszy link:</p><p><a href="${input.resetUrl}">${input.resetUrl}</a></p><p>Jesli to nie Ty, zignoruj ta wiadomosc. Link wygasa za 30 minut.</p>`,
  });

  if (mode === "dev") {
    const fallbackResetMailPath = path.join(devMailDumpDir, "last-password-reset-email.json");
    const previewMessage = "message" in info ? String(info.message) : "Preview unavailable";
    await mkdir(path.dirname(fallbackResetMailPath), { recursive: true });
    await writeFile(
      fallbackResetMailPath,
      JSON.stringify(
        {
          email: input.email,
          username: input.username,
          resetUrl: input.resetUrl,
          preview: previewMessage,
        },
        null,
        2,
      ),
      "utf8",
    );

    return {
      mode,
      previewFile: fallbackResetMailPath,
      resetUrl: input.resetUrl,
    };
  }

  return {
    mode,
    messageId: info.messageId,
  };
}
