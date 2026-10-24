import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const expectedPin = (process.env.ADMIN_PIN || "1707").trim();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "Nie podano kodu PIN" }, { status: 400 });
    }

    if (pin.trim() !== expectedPin) {
      return NextResponse.json({ error: "Niepoprawny kod PIN" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Błąd weryfikacji PIN:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
