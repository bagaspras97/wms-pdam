import { DemoState } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

export async function deleteActivityFromTables(activityId: string) {
  if (!supabase) throw new Error("Koneksi Supabase belum tersedia.");

  // Hapus relasi secara eksplisit agar tetap bekerja walaupun konfigurasi
  // cascade pada database lama belum mengikuti normalized.sql terbaru.
  const repairResult = await supabase.from("activity_repairs").delete().eq("activity_id", activityId);
  if (repairResult.error) throw new Error(`[activity_repairs.delete] ${repairResult.error.message}`);

  const toolResult = await supabase.from("activity_tools").delete().eq("activity_id", activityId);
  if (toolResult.error) throw new Error(`[activity_tools.delete] ${toolResult.error.message}`);

  const activityResult = await supabase.from("activities").delete().eq("id", activityId).select("id");
  if (activityResult.error) throw new Error(`[activities.delete] ${activityResult.error.message}`);
  if (!activityResult.data?.some((item) => item.id === activityId)) {
    throw new Error("Supabase tidak mengonfirmasi penghapusan opname.");
  }
}

export async function migrateStateToTables(state: DemoState) {
  if (!supabase) return;
  const assertOk = (stage: string, error: { message?: string; details?: string; hint?: string; code?: string } | null) => {
    if (!error) return;
    throw new Error(`[${stage}] ${error.message ?? "Supabase request failed"}${error.code ? ` (${error.code})` : ""}${error.details ? ` · ${error.details}` : ""}${error.hint ? ` · ${error.hint}` : ""}`);
  };
  if (state.officials) {
    // Tabel ini ditambahkan sebagai migrasi opsional agar versi database lama
    // tetap dapat menjalankan modul utama sebelum SQL terbaru diterapkan.
    await supabase.from("officials").upsert({ id: 1, kasubag_name: state.officials.kasubag, kepala_bagian_name: state.officials.kepalaBagian, admin_name: state.officials.admin, updated_at: new Date().toISOString() });
  }
  const regions = state.regions.map((item) => ({ code: item.code, name: item.name, active: true }));
  const repairs = state.repairCodes.map((item) => ({ code: item.code, name: item.name, price_per_point: item.pricePerPoint, active: true }));
  const tools = state.tools.map((name) => ({ name, active: true }));
  if (regions.length) {
    const result = await supabase.from("regions").upsert(regions);
    assertOk("regions.upsert", result.error);
  }
  if (repairs.length) {
    const result = await supabase.from("repair_codes").upsert(repairs);
    assertOk("repair_codes.upsert", result.error);
  }
  const toolResult = tools.length
    ? await supabase.from("tools").upsert(tools, { onConflict: "name" }).select("id,name")
    : { data: [], error: null };
  assertOk("tools.upsert", toolResult.error);
  const toolIds = new Map((toolResult.data ?? []).map((item) => [item.name, item.id]));
  const hamletRows: { region_code: string; name: string; active: boolean }[] = [];
  state.regions.forEach((region) => (region.hamlets ?? []).forEach((name) => hamletRows.push({ region_code: region.code, name, active: true })));
  const hamletResult = hamletRows.length ? await supabase.from("hamlets").upsert(hamletRows, { onConflict: "region_code,name" }).select("id,region_code,name") : { data: [], error: null };
  assertOk("hamlets.upsert", hamletResult.error);
  const hamletIds = new Map((hamletResult.data ?? []).map((item) => [`${item.region_code}:${item.name}`, item.id]));
  const activities = state.activities.map((item) => ({ id: item.id, name: item.name, region_code: item.regionCode ?? null, hamlet_id: item.regionCode && item.hamlet ? hamletIds.get(`${item.regionCode}:${item.hamlet}`) ?? null : null, target_date: item.targetDate || null, note: item.note, payment_status: item.paymentStatus ?? "Belum dibayar", paid_at: item.paidAt ?? null, payment_note: item.paymentNote ?? null, legacy_payload: item, created_at: item.createdAt }));
  const activityResult = activities.length ? await supabase.from("activities").upsert(activities) : { error: null };
  assertOk("activities", activityResult.error);
  const repairRows = state.activities.flatMap((activity) => (activity.repairItems ?? []).map((item) => ({ activity_id: activity.id, repair_code: item.code, points: item.points, price_per_point: item.pricePerPoint })));
  if (repairRows.length) { const result = await supabase.from("activity_repairs").upsert(repairRows, { onConflict: "activity_id,repair_code" }); assertOk("activity_repairs", result.error); }
  const activityTools = state.activities.flatMap((activity) => (activity.toolsUsed ?? []).map((name) => ({ activity_id: activity.id, tool_id: toolIds.get(name) })).filter((item): item is { activity_id: string; tool_id: string } => Boolean(item.tool_id)));
  if (activityTools.length) { const result = await supabase.from("activity_tools").upsert(activityTools); assertOk("activity_tools", result.error); }

  // State aplikasi adalah sumber data aktif. Rekonsiliasi penghapusan dimulai
  // dari tabel relasi agar foreign key master data tetap aman.
  const [existingRepairs, existingActivityTools, existingActivities, existingHamlets, existingTools, existingRepairCodes, existingRegions] = await Promise.all([
    supabase.from("activity_repairs").select("activity_id,repair_code"),
    supabase.from("activity_tools").select("activity_id,tool_id"),
    supabase.from("activities").select("id"),
    supabase.from("hamlets").select("id,region_code,name"),
    supabase.from("tools").select("id,name"),
    supabase.from("repair_codes").select("code"),
    supabase.from("regions").select("code"),
  ]);
  assertOk("activity_repairs.select", existingRepairs.error);
  assertOk("activity_tools.select", existingActivityTools.error);
  assertOk("activities.select", existingActivities.error);
  assertOk("hamlets.select", existingHamlets.error);
  assertOk("tools.select", existingTools.error);
  assertOk("repair_codes.select", existingRepairCodes.error);
  assertOk("regions.select", existingRegions.error);

  const desiredRepairRelations = new Set(repairRows.map((item) => `${item.activity_id}:${item.repair_code}`));
  const staleRepairRelations = (existingRepairs.data ?? []).filter((item) => !desiredRepairRelations.has(`${item.activity_id}:${item.repair_code}`));
  for (const item of staleRepairRelations) {
    const result = await supabase.from("activity_repairs").delete().eq("activity_id", item.activity_id).eq("repair_code", item.repair_code);
    assertOk("activity_repairs.delete", result.error);
  }

  const desiredToolRelations = new Set(activityTools.map((item) => `${item.activity_id}:${item.tool_id}`));
  const staleToolRelations = (existingActivityTools.data ?? []).filter((item) => !desiredToolRelations.has(`${item.activity_id}:${item.tool_id}`));
  for (const item of staleToolRelations) {
    const result = await supabase.from("activity_tools").delete().eq("activity_id", item.activity_id).eq("tool_id", item.tool_id);
    assertOk("activity_tools.delete", result.error);
  }

  const desiredActivityIds = new Set(state.activities.map((item) => item.id));
  const staleActivityIds = (existingActivities.data ?? []).filter((item) => !desiredActivityIds.has(item.id)).map((item) => item.id);
  if (staleActivityIds.length) {
    const result = await supabase.from("activities").delete().in("id", staleActivityIds);
    assertOk("activities.delete", result.error);
  }

  const desiredHamlets = new Set(hamletRows.map((item) => `${item.region_code}:${item.name.toLocaleLowerCase("id-ID")}`));
  const staleHamletIds = (existingHamlets.data ?? [])
    .filter((item) => !desiredHamlets.has(`${item.region_code}:${item.name.toLocaleLowerCase("id-ID")}`))
    .map((item) => item.id);
  if (staleHamletIds.length) {
    const result = await supabase.from("hamlets").delete().in("id", staleHamletIds);
    assertOk("hamlets.delete", result.error);
  }

  const desiredToolNames = new Set(state.tools.map((name) => name.toLocaleLowerCase("id-ID")));
  const staleToolIds = (existingTools.data ?? []).filter((item) => !desiredToolNames.has(item.name.toLocaleLowerCase("id-ID"))).map((item) => item.id);
  if (staleToolIds.length) {
    const result = await supabase.from("tools").delete().in("id", staleToolIds);
    assertOk("tools.delete", result.error);
  }

  const desiredRepairCodes = new Set(state.repairCodes.map((item) => item.code));
  const staleRepairCodes = (existingRepairCodes.data ?? []).filter((item) => !desiredRepairCodes.has(item.code)).map((item) => item.code);
  if (staleRepairCodes.length) {
    const result = await supabase.from("repair_codes").delete().in("code", staleRepairCodes);
    assertOk("repair_codes.delete", result.error);
  }

  const desiredRegionCodes = new Set(state.regions.map((item) => item.code));
  const staleRegionCodes = (existingRegions.data ?? []).filter((item) => !desiredRegionCodes.has(item.code)).map((item) => item.code);
  if (staleRegionCodes.length) {
    const result = await supabase.from("regions").delete().in("code", staleRegionCodes);
    assertOk("regions.delete", result.error);
  }
}

export async function loadStateFromTables(fallback: DemoState): Promise<DemoState | null> {
  if (!supabase) return null;
  const [regionsResult, repairsResult, toolsResult, activitiesResult] = await Promise.all([
    supabase.from("regions").select("code,name,active,hamlets(name)").eq("active", true),
    supabase.from("repair_codes").select("code,name,price_per_point,active").eq("active", true),
    supabase.from("tools").select("name,active").eq("active", true),
    supabase.from("activities").select("legacy_payload").order("created_at", { ascending: false }),
  ]);
  if (regionsResult.error || repairsResult.error || toolsResult.error || activitiesResult.error) return null;
  const regions = (regionsResult.data ?? []).map((item) => ({ code: item.code, name: item.name, hamlets: ((item.hamlets as { name: string }[] | null) ?? []).map((hamlet) => hamlet.name) }));
  const repairCodes = (repairsResult.data ?? []).map((item) => ({ code: item.code, name: item.name, pricePerPoint: Number(item.price_per_point) }));
  const tools = (toolsResult.data ?? []).map((item) => item.name);
  const activities = (activitiesResult.data ?? []).map((item) => item.legacy_payload as DemoState["activities"][number]).filter(Boolean);
  if (!regions.length && !repairCodes.length && !tools.length && !activities.length) return null;
  const officialsResult = await supabase.from("officials").select("kasubag_name,kepala_bagian_name,admin_name").eq("id", 1).maybeSingle();
  const officials = officialsResult.data ? { kasubag: officialsResult.data.kasubag_name, kepalaBagian: officialsResult.data.kepala_bagian_name, admin: officialsResult.data.admin_name } : fallback.officials;
  return { ...fallback, regions, repairCodes, tools, activities, officials };
}
