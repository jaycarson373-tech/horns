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
  promptVersion: "gumbus-reference-v2",
  imagePrompt:
    "Create a custom Gumbus profile picture using both supplied references. Reference A is the user's profile picture and provides the customization cues. Reference B is the official Gumbus cat and defines the character's face and anatomy. The finished subject must clearly be Gumbus: a gray-brown tabby cat with an extremely close wide-angle face, enormous glossy green-gray eyes, broad muzzle, large centered nose, tiny lower lip, upright ears, and a weird but cute expression. Preserve and adapt the most recognizable traits from Reference A onto Gumbus, including its art style, color palette, hat, glasses, clothing, accessories, expression, pose, lighting, and background where possible. If Reference A is illustrated, render Gumbus in that same illustration style. If Reference A is photographic, keep Gumbus photographic. Do not retain a human face or merely add cat ears. Do not replace Gumbus with a generic cat. Keep a centered square PFP crop with the face prominent and immediately readable at small size. Include no new text, logos, watermarks, extra subjects, unrelated props, gore, or weapons.",
  templateImagePath: "site/gumbus-logo.png",
  replyText: "Gumbified.",
  replyTextFallbacks: ["Michi mode enabled.", "Gumbus has arrived.", "Cat acquired."],
  tempFilePrefix: "gumbus-pfp",
  mediaFilename: "gumbified.png",
  userAgent: "gumbus-pfp-bot/0.1.0"
};
