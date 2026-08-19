import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client() {
  const endpoint = 
    process.env.R2_ENDPOINT_URL ||
    process.env.R2_ENDPOINT || 
    process.env.CLOUDFLARE_R2_ENDPOINT || 
    process.env.CLOUDFLARE_ENDPOINT ||
    (process.env.CLOUDFLARE_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

  const accessKeyId = 
    process.env.R2_ACCESS_KEY_ID || 
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
    process.env.AWS_ACCESS_KEY_ID || 
    "";

  const secretAccessKey = 
    process.env.R2_SECRET_ACCESS_KEY || 
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 
    process.env.AWS_SECRET_ACCESS_KEY || 
    "";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const cleanEndpoint = endpoint.trim().startsWith("http") 
    ? endpoint.trim() 
    : `https://${endpoint.trim()}`;

  return new S3Client({
    region: "auto",
    endpoint: cleanEndpoint,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
    forcePathStyle: true,
  });
}

function getBucketName() {
  return (
    process.env.R2_BUCKET_NAME || 
    process.env.CLOUDFLARE_R2_BUCKET_NAME || 
    process.env.BUCKET_NAME || 
    "photo-party"
  ).trim();
}

const LIKES_FILE_KEY = "metadata/likes.json";

async function getLikesMap(s3: S3Client, bucket: string): Promise<Record<string, number>> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: LIKES_FILE_KEY,
    });
    const res = await s3.send(command);
    if (!res.Body) return {};
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, action } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Brak klucza pliku" }, { status: 400 });
    }

    const s3 = getR2Client();
    const bucket = getBucketName();

    if (!s3) {
      return NextResponse.json({ error: "Błąd konfiguracji R2" }, { status: 500 });
    }

    const likesMap = await getLikesMap(s3, bucket);
    const current = likesMap[key] || 0;

    if (action === "unlike") {
      likesMap[key] = Math.max(0, current - 1);
    } else {
      likesMap[key] = current + 1;
    }

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: LIKES_FILE_KEY,
      Body: JSON.stringify(likesMap),
      ContentType: "application/json",
    });

    await s3.send(putCommand);

    return NextResponse.json({ likes: likesMap[key] });
  } catch (error) {
    console.error("Błąd zapisu polubienia:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}