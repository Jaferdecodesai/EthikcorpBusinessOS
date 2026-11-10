import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fira-sans/latin-400.css";
import "@fontsource/fira-sans/latin-500.css";
import "@fontsource/fira-sans/latin-600.css";
import "@fontsource/fira-sans/latin-700.css";
import "@fontsource/fira-code/latin-500.css";
import "./style.css";
import { cloudPreview, ensureCloudSession } from "./hosting";
import { parseHash } from "../shared/build-steps.mjs";
import { ProductApp } from "./product";
import "./portal.css";

function RootApp() {
  const [sessionReady, setSessionReady] = useState(!cloudPreview);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => { let active=true; ensureCloudSession().then(()=>{if(active)setSessionReady(true);}).catch(error=>{if(active)setSessionError(error.message);}); return ()=>{active=false;}; }, []);
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const update = () => setHash(window.location.hash); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => {
    const route = parseHash(hash);
    const title = route.tab === "pm" ? "Superbrain PM" : route.tab === "builder" ? "Superbrain Builder" : route.role === "admin" ? "AqionBrain admin" : route.role === "department" ? "Department" : route.tab === "bots" ? "Superbots" : "Superbrain CEO";
    document.title = `${title} · Aqion Superbrain`;
  }, [hash]);
  if (!sessionReady) return <main className="cloud-session-status" role={sessionError ? "alert" : "status"}><h1>Aqion Superbrain</h1><p>{sessionError || "Opening your cloud workspace…"}</p>{sessionError && <button onClick={()=>location.reload()}>Try again</button>}</main>;
  return <ProductApp hash={hash || "#pm"} />;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><RootApp /></React.StrictMode>);
