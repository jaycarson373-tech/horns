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
  promptVersion: "gumbus-michi-v1",
  imagePrompt:
    "Transform this profile picture into a custom Gumbus / michi meme-cat PFP. Turn the subject into a cute weird internet cat avatar while preserving the original PFP's recognizable identity cues: colors, accessories, hat, outfit vibe, expression, pose, background, crop, and composition where possible. The result should look like a hand-drawn collectible meme PFP: simple bold black outlines, soft rounded cat head, giant glossy slightly goofy eyes, tiny nose and mouth, cute awkward expression, small cat ears, whiskers, and charming low-effort doodle energy. Make it feel like a Gumbus-inspired silly cat character, not a realistic animal photo. If the original PFP has a signature accessory or color palette, adapt it onto the cat. Keep it square, centered, clean, and viral profile-picture ready. Do not copy any exact existing character or asset. Do not include text, logos, watermarks, extra people, weapons, gore, or a new unrelated background.",
  replyText: "Gumbified.",
  replyTextFallbacks: ["Michi mode enabled.", "Gumbus has arrived.", "Cat acquired."],
  tempFilePrefix: "gumbus-pfp",
  mediaFilename: "gumbified.png",
  userAgent: "gumbus-pfp-bot/0.1.0"
};
