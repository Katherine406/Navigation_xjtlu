import { BADGE_DEFS } from "../data/stamps";
import { requireSupabase } from "./supabase";

export type ViewerRole = "guest" | "student" | "admin";

export interface BraceletProfile {
  id: string;
  role: "student" | "admin";
  display_name: string | null;
}

export interface BraceletView {
  token: string;
  studentId: string;
  badgeIds: number[];
  viewerRole: ViewerRole;
  viewerProfile: BraceletProfile | null;
}

interface BraceletRow {
  token: string;
  student_id: string;
}

export async function getCurrentProfile(): Promise<BraceletProfile | null> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await client
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as BraceletProfile | null) ?? null;
}

export async function signInAdmin(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutBraceletUser() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function fetchBraceletView(token: string): Promise<BraceletView> {
  const client = requireSupabase();
  const viewerProfile = await getCurrentProfile();

  const { data: bracelet, error: braceletError } = await client
    .from("bracelets")
    .select("token, student_id")
    .eq("token", token)
    .maybeSingle();

  if (braceletError) throw braceletError;
  if (!bracelet) throw new Error("Bracelet not found.");

  const row = bracelet as BraceletRow;
  const { data: badgeRows, error: badgesError } = await client
    .from("student_badges")
    .select("badge_id")
    .eq("student_id", row.student_id)
    .order("badge_id", { ascending: true });

  if (badgesError) throw badgesError;

  const badgeIds = (badgeRows ?? [])
    .map((item) => Number(item.badge_id))
    .filter((id) => BADGE_DEFS.some((badge) => badge.id === id));

  return {
    token: row.token,
    studentId: row.student_id,
    badgeIds,
    viewerRole: viewerProfile?.role ?? "guest",
    viewerProfile,
  };
}

export async function unlockRandomBadgeForBracelet(token: string): Promise<number | null> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("unlock-random-badge", {
    body: { token },
  });

  if (error) throw error;
  return typeof data?.badge_id === "number" ? data.badge_id : null;
}

