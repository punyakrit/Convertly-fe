import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("conversions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const id = searchParams.get("id");

    const supabase = getSupabaseAdmin();

    if (id) {
      // Delete single item
      const { data: record } = await supabase
        .from("conversions")
        .select("*")
        .eq("id", id)
        .single();

      if (record) {
        try {
          await supabase.storage.from("converted").remove([`${id}/${record.file_name}`]);
          await supabase.storage.from("uploads").remove([`${id}/${record.file_name}`]);
        } catch {
          // best-effort cleanup
        }
      }

      const { error } = await supabase.from("conversions").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    } else if (userId) {
      // Clear all for user
      const { error } = await supabase.from("conversions").delete().eq("user_id", userId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ success: false, error: "user_id or id required" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
