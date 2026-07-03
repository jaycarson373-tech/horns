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
  botName: "AnsemPfpBot",
  defaultBotUsername: "AnsemPfpBot",
  transformationName: "ansemified",
  imagePrompt:
    "Transform this profile picture into a viral Ansem Army style PFP. Preserve the original subject's recognizable identity, pose, expression, outfit, accessories, colors, and background where possible. Reimagine it with warm low-resolution flash-photo meme energy, early-2010s camera texture, confident playful grin, casual party-photo vibe, soft film grain, warm wood-panel and yellow-orange lighting inspiration when it fits, centered square PFP crop. Do not copy or impersonate any real person's exact face; use the input subject's own face and features. No text, no logos unless already on the original image.",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
