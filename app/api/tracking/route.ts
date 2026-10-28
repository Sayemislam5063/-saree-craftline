import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Tracking API is not implemented yet.",
    },
    { status: 501 },
  );
}