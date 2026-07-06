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
    "Create an ANSEMFY avatar from the two references. Reference A is the user's profile picture and controls the identity: face, skin tone, eyes, facial hair, hair color, and recognizable facial features. Reference B is the ANSEMFY template and controls the overall meme: same warm kitchen background, orange flash lighting, side-facing body angle, head turned toward camera, confident smirk, square PFP crop, and viral low-fi photo vibe. The final image must look like the person from Reference A has been inserted into the ANSEMFY template. Do not keep the original Reference B face. Do not output the original template person. The subject must wear a hoodie or hooded streetwear top, with the hood/hoodie clearly visible. Prefer a teal, blue, black, or dark hoodie if it fits the image. Keep the ANSEMFY pose, crop, background, warm lighting, and composition consistent across every output. Make it photorealistic, not a cartoon or illustration. No text, no logos, no extra people, no new background, no fantasy effects.",
  templateImagePath: "assets/ansem-template.jpg",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
