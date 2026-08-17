import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function POST(request: Request) {
  try {
    const { filename, contentType, author } = await request.json();
    const s3 = getR2Client();

    if (!s3) {
      return NextResponse.json({ error: "Brak konfiguracji R2" }, { status: 500 });
    }

    const bucket = (
      process.env.R2_BUCKET_NAME || 
      process.env.CLOUDFLARE_R2_BUCKET_NAME || 
      process.env.BUCKET_NAME || 
      "photo-party"
    ).trim();

    const guestName = author && author.trim() ? encodeURIComponent(author.trim()) : "Gosc";
    const cleanFilename = (filename || "plik.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");

    // Zapisujemy autora bezpośrednio w kluczu pliku
    const uniqueKey = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}__AUTOR__${guestName}__${cleanFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      ContentType: contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ uploadUrl, key: uniqueKey });
  } catch (error) {
    console.error("Błąd generowania URL:", error);
    return NextResponse.json({ error: "Nie udało się wygenerować adresu uploadu" }, { status: 500 });
  }
}