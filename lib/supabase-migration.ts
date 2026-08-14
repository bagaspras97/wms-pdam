import { DemoState } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

export async function migrateStateToTables(state: DemoState) {
  if (!supabase) return;
  const assertOk = (stage: string, error: { message?: string; details?: string; hint?: string; code?: string } | null) => {
    if (!error) return;
    throw new Error(`[${stage}] ${error.message ?? "Supabase request failed"}${error.code ? ` (${error.code})` : ""}${error.details ? ` · ${error.details}` : ""}${error.hint ? ` · ${error.hint}` : ""}`);
  };
  const regions = state.regions.map((item) => ({ code: item.code, name: item.name, active: true }));
  const repairs = state.repairCodes.map((item) => ({ code: item.code, name: item.name, price_per_point: item.pricePerPoint, active: true }));
  const tools = state.tools.map((name) => ({ name, active: true }));
  const regionResult = await supabase.from("regions").upsert(regions);
  assertOk("regions", regionResult.error);
  const repairResult = await supabase.from("repair_codes").upsert(repairs);
  assertOk("repair_codes", repairResult.error);
  const toolResult = await supabase.from("tools").upsert(tools, { onConflict: "name" }).select("id,name");
  assertOk("tools", toolResult.error);
  const toolIds = new Map((toolResult.data ?? []).map((item) => [item.name, item.id]));
  const hamletRows: { region_code: string; name: string; active: boolean }[] = [];
  state.regions.forEach((region) => (region.hamlets ?? []).forEach((name) => hamletRows.push({ region_code: region.code, name, active: true })));
  const hamletResult = hamletRows.length ? await supabase.from("hamlets").upsert(hamletRows, { onConflict: "region_code,name" }).select("id,region_code,name") : { data: [], error: null };
  assertOk("hamlets", hamletResult.error);
  const hamletIds = new Map((hamletResult.data ?? []).map((item) => [`${item.region_code}:${item.name}`, item.id]));
  const activities = state.activities.map((item) => ({ id: item.id, name: item.name, region_code: item.regionCode ?? null, hamlet_id: item.regionCode && item.hamlet ? hamletIds.get(`${item.regionCode}:${item.hamlet}`) ?? null : null, target_date: item.targetDate || null, note: item.note, payment_status: item.paymentStatus ?? "Belum dibayar", paid_at: item.paidAt ?? null, payment_note: item.paymentNote ?? null, legacy_payload: item, created_at: item.createdAt }));
  const activityResult = activities.length ? await supabase.from("activities").upsert(activities) : { error: null };
  assertOk("activities", activityResult.error);
  const repairRows = state.activities.flatMap((activity) => (activity.repairItems ?? []).map((item) => ({ activity_id: activity.id, repair_code: item.code, points: item.points, price_per_point: item.pricePerPoint })));
  if (repairRows.length) { const result = await supabase.from("activity_repairs").upsert(repairRows, { onConflict: "activity_id,repair_code" }); assertOk("activity_repairs", result.error); }
  const activityTools = state.activities.flatMap((activity) => (activity.toolsUsed ?? []).map((name) => ({ activity_id: activity.id, tool_id: toolIds.get(name) })).filter((item): item is { activity_id: string; tool_id: string } => Boolean(item.tool_id)));
  if (activityTools.length) { const result = await supabase.from("activity_tools").upsert(activityTools); assertOk("activity_tools", result.error); }
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
  return { ...fallback, regions, repairCodes, tools, activities };
}
