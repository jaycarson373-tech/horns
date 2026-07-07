export type TransformationBotConfig = {
  botName: string;
  defaultBotUsername: string;
  transformationName: string;
  promptVersion: string;
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
  promptVersion: "ansem-face-v3-no-hoodie",
  imagePrompt:
    "Perform a photorealistic ANSEMFY face/identity replacement using two references. Reference A is the user's profile picture. Use Reference A only for the person's identity: face shape, skin tone, eyes, eyebrows, nose, mouth, facial hair, hairline, hair color, hairstyle, glasses, and other facial/accessory traits visible on the head. Reference B is the official ANSEMFY template. Reference B controls everything else: exact kitchen background, warm orange flash lighting, square PFP crop, camera angle, side-facing body pose, head turned toward camera, smirk/smile energy, light yellow shirt, body proportions, low-fi grain, color grading, and composition. Output must look like the exact ANSEMFY photo/template with only the face/head identity changed to match Reference A. Do not change the outfit. Do not add a hoodie. Do not add a green hoodie. Do not add a blue hoodie. Do not add a jacket. Do not add streetwear. Do not add hats unless the user's PFP has eyewear/headwear that is central to their identity, and even then keep the ANSEMFY shirt/body/background unchanged. Do not make a new scene, new pose, new crop, new clothing, cartoon, anime, illustration, fantasy effect, logo, or text. Keep the result consistent across users: same ANSEMFY template, different user's face.",
  templateImagePath: "assets/ansem-template.jpg",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
