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
import { BusinessApp } from "./business";
import "./portal.css";

function RootApp() {
  const [sessionReady, setSessionReady] = useState(!cloudPreview);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => { let active=true; ensureCloudSession().then(()=>{if(active)setSessionReady(true);}).catch(error=>{if(active)setSessionError(error.message);}); return ()=>{active=false;}; }, []);
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const update = () => setHash(window.location.hash); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => {
    document.title = "Ethikcorp BusinessOS";
  }, [hash]);
  if (!sessionReady) return <main className="cloud-session-status" role={sessionError ? "alert" : "status"}><h1>Ethikcorp BusinessOS</h1><p>{sessionError || "Opening your workspace…"}</p>{sessionError && <button onClick={()=>location.reload()}>Try again</button>}</main>;
  return <BusinessApp />;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><RootApp /></React.StrictMode>);
