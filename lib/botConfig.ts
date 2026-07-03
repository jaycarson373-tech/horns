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
    "Ansemify this profile picture by using the iconic Ansem meme-photo as the template and changing the face/identity to match the input PFP. The final image must be a photorealistic square PFP that looks like a real low-resolution early-2010s point-and-shoot flash photo, not anime, not a cartoon, not an illustration, not CGI, and not a game avatar. Keep the Ansem template: warm wooden cabinet or closet background, yellow or pale cream shirt, over-the-shoulder body pose, close crop, confident mischievous smirk, warm orange flash glow on the right side, direct camera flash, natural skin texture, soft film grain, slight JPEG compression, casual dorm/kitchen party-photo energy. Replace only the face, hair, skin tone, facial structure, and small identity cues so the person matches the commenter/source profile picture. If the source is a cartoon, mascot, animal, or non-human avatar, translate its recognizable face/colors/accessories into a photorealistic human face in the same Ansem template. Do not preserve the source background or full outfit unless needed for tiny identity cues; the result should look like another member of the Ansem banner wall. No fantasy effects, glowing rings, wings, hoodies, horns, cat ears, text, watermarks, or new logos.",
  replyText: "Ansemified.",
  replyTextFallbacks: ["Ansem mode enabled.", "Become Ansem.", "PFP upgraded."],
  tempFilePrefix: "ansem-pfp",
  mediaFilename: "ansemified.png",
  userAgent: "ansem-pfp-bot/0.1.0"
};
