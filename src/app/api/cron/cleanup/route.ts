import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    // Fetch all conversions older than 1 hour
    const { data: oldRecords, error: fetchError } = await supabase
      .from("conversions")
      .select("id, file_name")
      .lt("created_at", oneHourAgo);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!oldRecords || oldRecords.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No old records found" });
    }

    // Delete files from storage buckets
    let storageDeleted = 0;
    for (const record of oldRecords) {
      try {
        await supabase.storage.from("converted").remove([`${record.id}/${record.file_name}`]);
        await supabase.storage.from("uploads").remove([`${record.id}/${record.file_name}`]);
        storageDeleted++;
      } catch {
        // best-effort — continue with other records
      }
    }

    // Delete the database records
    const ids = oldRecords.map((r) => r.id);
    const { error: deleteError } = await supabase
      .from("conversions")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      deleted: oldRecords.length,
      storageDeleted,
      message: `Cleaned up ${oldRecords.length} conversions older than 1 hour`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
