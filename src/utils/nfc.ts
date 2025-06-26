import { randomBytes } from "crypto";

export const generateNFCCode = (): string => {
  // Generate a 16-byte random hex string for NFC code
  return randomBytes(16).toString("hex");
};
