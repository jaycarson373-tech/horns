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
  promptVersion: "gumbus-locked-template-v5",
  imagePrompt:
    "Reference B, the official Gumbus photograph, is the locked base image and must remain almost pixel-identical. Recreate Reference B with the exact same Gumbus cat, enormous glossy eyes, face, fur, ears, muzzle, nose, expression, head angle, close-up crop, white background, warm lighting, photographic realism, proportions, and composition. Reference A, the user's profile picture, is used only to choose a few recognizable customization details to add onto this locked Gumbus image. Add only clearly visible wearable traits from Reference A, such as the same hat, glasses, small head accessory, collar, tie, or clothing neckline, and optionally a subtle color accent. Fit those accessories naturally onto Gumbus without covering his eyes, nose, or defining face. If Reference A has no clear wearable accessory, keep the locked Gumbus image unchanged rather than inventing anything. Do not copy Reference A's person, face, body, pose, background, crop, rendering style, visual effects, or composition. Do not turn Gumbus into a cartoon, illustration, human, generic cat, full-body character, or different breed. Do not change the white background or zoom. Do not add text, logos, watermarks, extra subjects, weapons, or unrelated props. The result must always be immediately recognizable as the exact official Gumbus base photograph with only minimal PFP-specific accessories added.",
  templateImagePath: "site/gumbus-logo.png",
  replyText: "Gumbified.",
  replyTextFallbacks: ["Michi mode enabled.", "Gumbus has arrived.", "Cat acquired."],
  tempFilePrefix: "gumbus-pfp",
  mediaFilename: "gumbified.png",
  userAgent: "gumbus-pfp-bot/0.1.0"
};
