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
  botName: "PumpXBT",
  defaultBotUsername: "PumpXBT_",
  transformationName: "market intelligence",
  promptVersion: "pumpxbt-market-agent-v1",
  imagePrompt: "Image transformation is disabled in PumpXBT agent mode.",
  replyText: "PumpXBT analysis ready.",
  replyTextFallbacks: [],
  tempFilePrefix: "pumpxbt",
  mediaFilename: "pumpxbt.png",
  userAgent: "pumpxbt-agent/0.1.0"
};
