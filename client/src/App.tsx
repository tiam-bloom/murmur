import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { FingerprintContext } from "./FingerprintContext";
import type { Identity } from "./FingerprintContext";
import { getOrCreateFingerprint } from "./fingerprint";
import { getDisplayName, getDisplayColor } from "./utils";
import { WebSocketProvider } from "./hooks/useWebSocket";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Post from "./pages/Post";
import Messages from "./pages/Messages";

export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateFingerprint()
      .then((fp) => {
        setIdentity({
          fingerprint: fp,
          displayName: getDisplayName(fp),
          displayColor: getDisplayColor(fp),
        });
      })
      .catch(() => {
        setError("无法加载浏览器指纹，请确保已启用 JavaScript 并检查网络连接。");
      });
  }, []);

  if (error) {
    return (
      <div style={{ color: "#e0e0e0", background: "#1a1a2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!identity) {
    return (
      <div style={{ color: "#e0e0e0", background: "#1a1a2e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>初始化中...</p>
      </div>
    );
  }

  return (
    <FingerprintContext.Provider value={identity}>
      <WebSocketProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<Post />} />
            <Route path="/messages" element={<Messages />} />
          </Routes>
        </Layout>
      </WebSocketProvider>
    </FingerprintContext.Provider>
  );
}
