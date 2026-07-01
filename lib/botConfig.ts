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
  botName: "CatifyBot",
  defaultBotUsername: "CatifyBot",
  transformationName: "catified",
  imagePrompt:
    "Transform this profile picture into a cute kitten avatar. The final image should be an actual cat, not a human with cat ears. Preserve recognizable colors, accessories, hat, vibe, pose, and background from the original where possible. Big glossy eyes, soft fur, centered square PFP, clean viral meme-cat style. No text, no logos unless already on the original image.",
  replyText: "Catified. 🐱",
  replyTextFallbacks: ["Cat mode enabled. 🐱", "You have been catified.", "Become the cat."],
  tempFilePrefix: "catify",
  mediaFilename: "catified.png",
  userAgent: "catify-bot/0.1.0"
};
