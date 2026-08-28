import sharp from "sharp";
import cloudinary from "../configs/cloudinary";

export async function compressImage(
  input: Buffer,
  targetReduction = 0.5,
): Promise<Buffer> {
  const originalSize = input.length;
  const targetSize = originalSize * (1 - targetReduction);

  let quality = 82;

  for (let i = 0; i < 8; i++) {
    const output = await sharp(input)
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
      })
      .toBuffer();

    if (output.length <= targetSize) {
      return output;
    }

    quality -= 8;
  }

  // Fallback
  return sharp(input)
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 45,
      effort: 6,
    })
    .toBuffer();
}

export async function uploadImage(
  imageBuffer: Buffer,
  folder = "trello/tasks",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Image upload failed"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(imageBuffer);
  });
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  folder = "trello/attachments",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: fileName.split(".")[0] + "_" + Date.now(),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("File upload failed"));
          return;
        }
        resolve(result.secure_url);
      },
    );

    uploadStream.end(fileBuffer);
  });
}
