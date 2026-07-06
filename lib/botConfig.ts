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
    "Create an ANSEMFY avatar using two references. Reference A is the user's profile picture and controls the person's identity: face shape, skin tone, eyes, eyebrows, facial hair, hair color, hairstyle, accessories, and any recognizable PFP traits. Reference B is the official ANSEMFY template and controls the meme format: warm kitchen background, orange flash lighting, side-facing body angle, head turned toward camera, confident smirk, square PFP crop, low-fi viral photo texture, and overall composition. The final image must look like the person from Reference A has been placed into the exact ANSEMFY template scene. Replace the face and identity from Reference B with Reference A. Do not keep the original template face. Do not turn everyone into the same person. Do not force a hoodie, hat, or any new clothing unless it is already an important part of Reference A. Keep clothing simple and consistent with the ANSEMFY photo, preferably the light shirt from the template unless Reference A has a signature accessory that should carry over. Preserve the ANSEMFY camera angle, body pose, head rotation, smile energy, crop, kitchen background, warm orange lighting, proportions, and color grading. Make it photorealistic, not cartoon, not anime, not illustration. No text, no logos, no fantasy effects, no extra people.",
  templateImagePath: "assets/ansem-template.jpg",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
