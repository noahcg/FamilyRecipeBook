import { z } from "zod";
import { OTP_MAX_LENGTH, OTP_MIN_LENGTH } from "@/lib/otp";

export const emailEntrySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const otpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_MIN_LENGTH},${OTP_MAX_LENGTH}}$`),
      "Enter the code from your email"
    ),
});

export type EmailEntryInput = z.infer<typeof emailEntrySchema>;
export type OtpCodeInput = z.infer<typeof otpCodeSchema>;
