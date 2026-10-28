import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type AdminVerification =
  | {
      authorized: true;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

export async function verifyAdminRequest(
  request: Request,
): Promise<AdminVerification> {
  const authorization = request.headers.get("authorization");

  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Admin login required.",
        },
        { status: 401 },
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!supabaseUrl || !publishableKey || !adminEmail) {
    console.error("Admin verification environment is incomplete.");

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Admin verification is not configured.",
        },
        { status: 503 },
      ),
    };
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data.user) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            message: "Please log in again.",
          },
          { status: 401 },
        ),
      };
    }

    const userEmail = data.user.email?.trim().toLowerCase();

    if (!userEmail || userEmail !== adminEmail) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            message: "You are not authorized to perform this action.",
          },
          { status: 403 },
        ),
      };
    }

    return { authorized: true };
  } catch (error) {
    console.error("Admin token verification failed:", error);

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Could not verify admin login. Please retry.",
        },
        { status: 503 },
      ),
    };
  }
}