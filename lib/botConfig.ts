export type TransformationBotConfig = {
  botName: string;
  defaultBotUsername: string;
  transformationName: string;
  imagePrompt: string;
  replyText: string;
  replyTextFallbacks: string[];
  tempFilePrefix: string;
  mediaFilename: string;
  userAgent: string;
};

export const botConfig: TransformationBotConfig = {
  botName: "BullifyBot",
  defaultBotUsername: "BullifyBot",
  transformationName: "bullified",
  imagePrompt:
    "Add realistic stylish bull horns to the subject in this profile picture. Preserve the original face, identity, pose, expression, clothing, accessories, art style, background, colors, crop, lighting, and composition. Only add horns. The horns should be symmetrical, attached naturally to the head or hairline, curved upward/outward like strong bull horns, dark charcoal to bone-gray with realistic texture and highlights. Do not change the face. Do not turn the person into a bull. Do not add text, logos, extra characters, fantasy effects, glowing rings, wings, helmets, or new backgrounds. If the input is a cartoon, mascot, animal, or stylized avatar, add matching horns in the same art style while preserving the original image.",
  replyText: "Bullified.",
  replyTextFallbacks: ["Bull mode enabled.", "You have been bullified.", "The horns stay on."],
  tempFilePrefix: "bullify",
  mediaFilename: "bullified.png",
  userAgent: "bullify-bot/0.1.0"
};
