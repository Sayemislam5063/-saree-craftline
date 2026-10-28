import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "This categories API endpoint is not implemented.",
    },
    { status: 501 },
  );
}