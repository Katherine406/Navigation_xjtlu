import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { BADGE_DEFS } from "../data/stamps";
import {
  fetchBraceletView,
  signInAdmin,
  signOutBraceletUser,
  unlockRandomBadgeForBracelet,
  type BraceletView,
} from "../services/braceletApi";
import { isSupabaseConfigured } from "../services/supabase";

const C = {
  navy: "#0E1B4D",
  royal: "#2350D8",
  sky: "#9ED0FF",
  ice: "#DCF0FF",
  cream: "#FFFBF0",
  white: "#FFFFFF",
  coral: "#FF6B6B",
  mint: "#5EEAA8",
  pale: "#C7DCF8",
};

function BraceletButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `2.5px solid ${C.navy}`,
        borderRadius: "12px",
        boxShadow: disabled ? "none" : `3px 3px 0 ${C.navy}`,
        backgroundColor: variant === "primary" ? C.royal : C.white,
        color: variant === "primary" ? C.white : C.navy,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 900,
        padding: "11px 14px",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function BraceletScreen() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<BraceletView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadBracelet = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const next = await fetchBraceletView(token);
      setView(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bracelet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBracelet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const unlockedSet = useMemo(() => new Set(view?.badgeIds ?? []), [view?.badgeIds]);
  const remaining = BADGE_DEFS.length - unlockedSet.size;
  const isAdmin = view?.viewerRole === "admin";

  const handleLogin = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await signInAdmin(email.trim(), password);
      setNotice("管理员登录成功。");
      await loadBracelet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await signOutBraceletUser();
      setNotice("已退出管理员账号。");
      await loadBracelet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const badgeId = await unlockRandomBadgeForBracelet(token);
      setNotice(badgeId ? `已随机解锁 badge #${badgeId}。` : "这个学生已经集齐全部 badge。");
      await loadBracelet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: C.ice,
        color: C.navy,
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "22px",
      }}
    >
      <section
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: C.cream,
          border: `3px solid ${C.navy}`,
          borderRadius: "18px",
          boxShadow: `6px 6px 0 ${C.navy}`,
          padding: "20px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            border: 0,
            background: "transparent",
            color: C.royal,
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 900,
            padding: 0,
            marginBottom: "14px",
          }}
        >
          Back to UniBuddy
        </button>

        <p style={{ fontSize: "13px", fontWeight: 900, color: C.royal, margin: 0 }}>NFC Bracelet</p>
        <h1 style={{ fontSize: "28px", lineHeight: 1.1, margin: "6px 0 8px", fontWeight: 950 }}>
          手环 Badge
        </h1>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#4B6898", margin: "0 0 16px" }}>
          Token: {token || "missing"}
        </p>

        {!isSupabaseConfigured && (
          <div
            style={{
              border: `2px solid ${C.coral}`,
              borderRadius: "12px",
              backgroundColor: "#FFF0F0",
              padding: "12px",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "14px",
            }}
          >
            Supabase 还没有配置。请在环境变量里设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。
          </div>
        )}

        {loading ? (
          <p style={{ fontWeight: 800 }}>正在读取手环信息...</p>
        ) : (
          <>
            {view && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ backgroundColor: C.white, border: `2px solid ${C.navy}`, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#4B6898" }}>已解锁</p>
                    <p style={{ margin: "5px 0 0", fontSize: "24px", fontWeight: 950 }}>
                      {view.badgeIds.length} / {BADGE_DEFS.length}
                    </p>
                  </div>
                  <div style={{ backgroundColor: C.white, border: `2px solid ${C.navy}`, borderRadius: "12px", padding: "12px" }}>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#4B6898" }}>当前身份</p>
                    <p style={{ margin: "5px 0 0", fontSize: "24px", fontWeight: 950 }}>
                      {isAdmin ? "管理员" : "学生"}
                    </p>
                  </div>
                </div>

                <div style={{ height: "12px", backgroundColor: C.pale, border: `2px solid ${C.navy}`, borderRadius: "999px", overflow: "hidden", marginBottom: "18px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(view.badgeIds.length / BADGE_DEFS.length) * 100}%`,
                      backgroundColor: C.royal,
                    }}
                  />
                </div>

                {isAdmin ? (
                  <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
                    <BraceletButton onClick={handleUnlock} disabled={busy || remaining <= 0}>
                      {remaining > 0 ? "随机解锁 1 个 Badge" : "已经全部解锁"}
                    </BraceletButton>
                    <BraceletButton onClick={handleSignOut} disabled={busy} variant="secondary">
                      退出管理员账号
                    </BraceletButton>
                  </div>
                ) : (
                  <div style={{ backgroundColor: C.white, border: `2px solid ${C.sky}`, borderRadius: "12px", padding: "12px", marginBottom: "18px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 900 }}>管理员登录</p>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@xjtluer.com"
                      style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${C.pale}`, borderRadius: "10px", padding: "10px", marginBottom: "8px", fontWeight: 700 }}
                    />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      type="password"
                      style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${C.pale}`, borderRadius: "10px", padding: "10px", marginBottom: "10px", fontWeight: 700 }}
                    />
                    <BraceletButton onClick={handleLogin} disabled={busy || !email.trim() || !password}>
                      登录管理员并解锁
                    </BraceletButton>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {BADGE_DEFS.map((badge) => {
                    const checked = unlockedSet.has(badge.id);
                    return (
                      <div
                        key={badge.id}
                        style={{
                          aspectRatio: "1",
                          border: checked ? `2.5px solid ${C.royal}` : `2.5px dashed ${C.pale}`,
                          borderRadius: badge.id <= 8 ? "50%" : "14px",
                          backgroundColor: checked ? C.white : "#F8FAFC",
                          opacity: checked ? 1 : 0.32,
                          display: "grid",
                          placeItems: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}${badge.imagePath}`}
                          alt={`badge-${badge.id}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {!checked && (
                          <span style={{ position: "absolute", fontSize: "18px", fontWeight: 950, color: C.navy }}>?</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {notice && (
          <p style={{ color: C.royal, fontSize: "13px", fontWeight: 900, margin: "14px 0 0" }}>{notice}</p>
        )}
        {error && (
          <p style={{ color: C.coral, fontSize: "13px", fontWeight: 900, margin: "14px 0 0" }}>{error}</p>
        )}
      </section>
    </main>
  );
}
