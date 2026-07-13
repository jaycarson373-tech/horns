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
  botName: "TinfoilPfpBot",
  defaultBotUsername: "TinfoilPfpBot",
  transformationName: "tinfoiled",
  promptVersion: "tinfoil-hat-v1",
  imagePrompt:
    "Edit this profile picture by adding a realistic crinkled silver aluminum tinfoil hat on top of the subject's head. The hat should look like a handmade conspiracy-theory foil hat: shiny metallic aluminum foil, wrinkled texture, cone or folded cap shape, slightly oversized, sitting naturally on the head and following the original lighting and perspective. Preserve the original profile picture almost exactly: keep the same face, identity, expression, pose, body, outfit, art style, background, colors, crop, and composition. Only add the tinfoil hat. Do not change the person's face. Do not turn the image into a new character. Do not add text, logos, extra people, weapons, or a new background. If the image is a cartoon, keep it cartoon; if it is a photo, keep it photorealistic.",
  replyText: "Tinfoiled.",
  replyTextFallbacks: ["Hat secured.", "The signal is blocked.", "Foil mode enabled."],
  tempFilePrefix: "tinfoil-pfp",
  mediaFilename: "tinfoiled.png",
  userAgent: "tinfoil-pfp-bot/0.1.0"
};
