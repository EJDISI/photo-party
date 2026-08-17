import { NextResponse } from "next/server";
import { 
  S3Client, 
  ListObjectsV2Command, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3";

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

function getPublicDomain() {
  const domain = (
    process.env.R2_PUBLIC_DOMAIN || 
    process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || 
    process.env.NEXT_PUBLIC_R2_DOMAIN || 
    ""
  ).trim();
  return domain.replace(/\/$/, "");
}

export async function GET() {
  try {
    const s3 = getR2Client();
    const bucket = getBucketName();
    const publicDomain = getPublicDomain();

    if (!s3) {
      return NextResponse.json({ error: "Błąd konfiguracji R2" }, { status: 500 });
    }

    const command = new ListObjectsV2Command({
      Bucket: bucket,
    });

    const data = await s3.send(command);

    if (!data.Contents || data.Contents.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    const photos = data.Contents.map((item) => {
      const key = item.Key || "";
      let author = "Gość";

      // Odczytujemy autora z nazwy pliku (__AUTOR__wartość__)
      if (key.includes("__AUTOR__")) {
        try {
          const parts = key.split("__AUTOR__");
          if (parts[1]) {
            const rawAuthor = parts[1].split("__")[0];
            author = decodeURIComponent(rawAuthor);
          }
        } catch {
          author = "Gość";
        }
      }

      const isVideo = !!(
        key.endsWith(".mp4") || 
        key.endsWith(".webm") || 
        key.endsWith(".mov")
      );

      return {
        key,
        url: publicDomain ? `${publicDomain}/${key}` : `/${key}`,
        author,
        uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
        isVideo,
      };
    });

    photos.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Błąd pobierania zdjęć z R2:", error);
    return NextResponse.json({ error: "Błąd pobierania zdjęć" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { key } = await request.json();
    const s3 = getR2Client();
    const bucket = getBucketName();

    if (!key) {
      return NextResponse.json({ error: "Brak klucza pliku" }, { status: 400 });
    }

    if (!s3) {
      return NextResponse.json({ error: "Błąd konfiguracji R2" }, { status: 500 });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd usuwania pliku z R2:", error);
    return NextResponse.json({ error: "Nie udało się usunąć pliku" }, { status: 500 });
  }
}