export type TransformationBotConfig = {
  botName: string;
  defaultBotUsername: string;
  transformationName: string;
  imagePrompt: string;
  templateImagePath: string;
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
    "You are performing a face replacement, not generating a new image. Reference A is the user's profile picture. Reference B is the official ANSEMFY template. Recreate Reference B almost perfectly. Only change one thing: replace the face in Reference B with the identity from Reference A. Everything else must remain identical to Reference B: exact camera angle, exact body pose, exact smile, exact head rotation, exact shirt, exact haircut shape, exact kitchen background, exact warm orange lighting, exact crop, exact composition, exact proportions, and exact color grading. The output must immediately be recognizable as the ANSEMFY template. Do not invent a new pose. Do not invent new clothing. Do not invent a new background. Do not change the framing. Do not create a cartoon or illustration. Do not stylize. Every output should look like it came from the exact same photograph, with only the person's face changed. This consistency is extremely important because all generated profile pictures need to look like members of the same army.",
  templateImagePath: "assets/ansem-template.jpg",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
