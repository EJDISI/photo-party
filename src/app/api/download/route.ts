import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "wspomnienie_z_wesela.jpg";

  if (!fileUrl) {
    return NextResponse.json({ error: "Brak adresu URL" }, { status: 400 });
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Nie udało się pobrać pliku z R2" }, { status: 500 });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.arrayBuffer();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Błąd pobierania:", error);
    return NextResponse.json({ error: "Błąd serwera podczas pobierania" }, { status: 500 });
  }
}