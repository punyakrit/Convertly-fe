import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { device_id } = await req.json();
    if (!device_id) {
      return NextResponse.json({ success: false, error: "device_id is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check existing
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("device_id", device_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // Create new
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ device_id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
