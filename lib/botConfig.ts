export type TransformationBotConfig = {
  botName: string;
  defaultBotUsername: string;
  transformationName: string;
  promptVersion: string;
  imagePrompt: string;
  templateImagePath?: string;
  replyText: string;
  replyTextFallbacks: string[];
  tempFilePrefix: string;
  mediaFilename: string;
  userAgent: string;
};

export const botConfig: TransformationBotConfig = {
  botName: "GumbusPfpBot",
  defaultBotUsername: "GumbusPfpBot",
  transformationName: "gumbified",
  promptVersion: "gumbus-overlay-v3",
  imagePrompt:
    "Edit Reference A, the user's profile picture. Reference A is the locked base image and must remain immediately recognizable. Preserve its exact subject or character, composition, crop, pose, body, clothing, hat, glasses, accessories, background, lighting, colors, texture, and original photographic or illustrated art style. Do not redesign, restage, or replace the scene. Add only the defining facial features of Gumbus from Reference B to the existing subject: oversized glossy green-gray eyes, a broad rounded cat muzzle, a large centered tabby nose, a tiny lower lip, subtle gray-brown tabby facial markings, and Gumbus's weird but cute expression. Integrate those features naturally into the original face while retaining the subject's identity and every recognizable detail from Reference A. For a full-body or character PFP, keep the full body and outfit exactly as shown and modify only the face. For an animal PFP, keep that animal, pose, and setting and blend in the Gumbus facial traits. Match Reference A's rendering style exactly: photographs stay photographic, cartoons stay in their original cartoon style, pixel art stays pixel art, and 3D art stays 3D. This is a precise feature-overlay edit, not a new Gumbus portrait. Do not create a generic standalone cat, do not zoom into a new close-up, do not add unrelated clothing or props, and do not change the background. Do not add text, logos, watermarks, extra subjects, gore, or weapons.",
  templateImagePath: "site/gumbus-logo.png",
  replyText: "Gumbified.",
  replyTextFallbacks: ["Michi mode enabled.", "Gumbus has arrived.", "Cat acquired."],
  tempFilePrefix: "gumbus-pfp",
  mediaFilename: "gumbified.png",
  userAgent: "gumbus-pfp-bot/0.1.0"
};
