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
  promptVersion: "gumbus-character-edit-v4",
  imagePrompt:
    "Edit Reference A in place; do not generate a new composition. Keep Reference A's exact crop, camera angle, pose, body position, outfit, hat, glasses, accessories, background, lighting, colors, and art style. Replace only the visible person or character with a complete Gumbus-style cat character occupying the same silhouette and wearing the same clothes and accessories. The transformed subject must have fully feline anatomy wherever visible: gray-brown tabby fur, upright cat ears, enormous glossy green-gray Gumbus eyes, a broad rounded feline muzzle, large centered cat nose, whiskers, tiny lower lip, and Gumbus's weird but cute expression. Preserve recognizable customization cues from the original subject through the same hairstyle shape when compatible, expression, outfit, accessories, pose, and color palette. If the original is full-body, create a small full-body cat in the exact same pose and outfit. If it is a headshot, create a cat head and upper body with the same framing and clothing. If Reference A already depicts an animal, retain its pose, outfit, and setting while changing its face toward Gumbus. Match Reference A's medium exactly: photographs remain photographic, cartoons remain in the same cartoon style, pixel art remains pixel art, and 3D art remains 3D. Do not paste cat eyes or a muzzle onto a human face. Do not leave human skin, human ears, or human facial anatomy. Do not create an unrelated generic cat portrait, zoom in, change the background, invent new clothing, or add props. No new text, logos, watermarks, extra subjects, gore, or weapons.",
  templateImagePath: "site/gumbus-logo.png",
  replyText: "Gumbified.",
  replyTextFallbacks: ["Michi mode enabled.", "Gumbus has arrived.", "Cat acquired."],
  tempFilePrefix: "gumbus-pfp",
  mediaFilename: "gumbified.png",
  userAgent: "gumbus-pfp-bot/0.1.0"
};
