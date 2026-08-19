import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const filename = searchParams.get("filename") || `plik_${Date.now()}`;

    if (!key) {
      return NextResponse.json({ error: "Brak klucza pliku" }, { status: 400 });
    }

    const s3 = getR2Client();
    const bucket = getBucketName();

    if (!s3) {
      return NextResponse.json({ error: "Błąd konfiguracji R2" }, { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const res = await s3.send(command);

    if (!res.Body) {
      return NextResponse.json({ error: "Plik nie został znaleziony" }, { status: 404 });
    }

    const bytes = await res.Body.transformToByteArray();
    const contentType = res.ContentType || (key.endsWith(".mp4") ? "video/mp4" : "image/jpeg");
    const encodedFilename = encodeURIComponent(filename);

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Błąd pobierania pliku z R2:", error);
    return NextResponse.json({ error: "Błąd pobierania pliku" }, { status: 500 });
  }
}