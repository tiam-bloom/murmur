import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIdentity } from "../FingerprintContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { displayName, displayColor } = useIdentity();
  const location = useLocation();

  const linkStyle = (path: string): React.CSSProperties => ({
    color: location.pathname === path ? displayColor : "#a0a0b8",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: location.pathname === path ? 600 : 400,
  });

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" style={{ textDecoration: "none", color: displayColor, fontSize: "18px", fontWeight: 700 }}>
            murmur
          </Link>
          <span style={{ color: "#555", fontSize: 12, marginLeft: 10, fontStyle: "italic" }}>
            低语随风，只存于记忆
          </span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link to="/" style={linkStyle("/")}>帖子</Link>
            <Link to="/messages" style={linkStyle("/messages")}>私信</Link>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: displayColor }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: displayColor, display: "inline-block" }} />
              {displayName}
            </span>
          </div>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
