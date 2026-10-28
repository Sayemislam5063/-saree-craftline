import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary configuration পাওয়া যায়নি।",
        },
        { status: 500 },
      );
    }

    const incomingForm = await request.formData();

    const file =
      incomingForm.get("file") ??
      incomingForm.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Upload করার image পাওয়া যায়নি।",
        },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          message: "শুধু image file upload করা যাবে।",
        },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "Image-এর size 10 MB-এর বেশি হতে পারবে না।",
        },
        { status: 413 },
      );
    }

    const cloudinaryForm = new FormData();

    cloudinaryForm.set("file", file);
    cloudinaryForm.set(
      "upload_preset",
      uploadPreset,
    );
    cloudinaryForm.set(
      "folder",
      "saree-craftline",
    );

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: cloudinaryForm,
        cache: "no-store",
      },
    );

    const result = await uploadResponse.json();

    if (
      !uploadResponse.ok ||
      !result.secure_url
    ) {
      console.error(
        "Cloudinary upload error:",
        result.error?.message,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Image upload করা যায়নি।",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Image upload করার সময় সমস্যা হয়েছে।",
      },
      { status: 500 },
    );
  }
}