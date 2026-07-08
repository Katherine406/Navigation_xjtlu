import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allBadgeIds = Array.from({ length: 20 }, (_, index) => index + 1);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase function environment variables are missing.");
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return Response.json({ error: "Please sign in as an admin first." }, { status: 401, headers: corsHeaders });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Missing bracelet token." }, { status: 400, headers: corsHeaders });
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return Response.json({ error: "Only admins can unlock badges." }, { status: 403, headers: corsHeaders });
    }

    const { data: bracelet, error: braceletError } = await serviceClient
      .from("bracelets")
      .select("student_id")
      .eq("token", token)
      .single();

    if (braceletError || !bracelet) {
      return Response.json({ error: "Bracelet not found." }, { status: 404, headers: corsHeaders });
    }

    const { data: existingRows, error: existingError } = await serviceClient
      .from("student_badges")
      .select("badge_id")
      .eq("student_id", bracelet.student_id);

    if (existingError) throw existingError;

    const existing = new Set((existingRows ?? []).map((row) => Number(row.badge_id)));
    const locked = allBadgeIds.filter((id) => !existing.has(id));

    if (locked.length === 0) {
      return Response.json({ badge_id: null, complete: true }, { headers: corsHeaders });
    }

    const badgeId = locked[Math.floor(Math.random() * locked.length)];
    const { error: insertError } = await serviceClient.from("student_badges").insert({
      student_id: bracelet.student_id,
      badge_id: badgeId,
      unlocked_by_admin_id: authData.user.id,
    });

    if (insertError) throw insertError;

    return Response.json({ badge_id: badgeId, complete: locked.length === 1 }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});

