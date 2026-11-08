import React from "react";

export const cloudPreview = import.meta.env.VITE_HOSTING === "cloudflare";
let sessionRequest: Promise<void> | null = null;
export function ensureCloudSession(): Promise<void> {
  if (!cloudPreview) return Promise.resolve();
  if (!sessionRequest) sessionRequest = fetch("/api/session",{credentials:"same-origin",cache:"no-store"}).then(async response=>{
    const body=await response.json();
    if(!response.ok||!body.ready)throw new Error(body.error||"Could not open your cloud workspace.");
  }).catch(error=>{sessionRequest=null;throw error;});
  return sessionRequest;
}
export function HostingNotice() {
  return cloudPreview ? <div className="hosting-notice" role="note"><strong>Global front end.</strong><span>This Cloudflare preview is not the company data plane. UAE processing, storage, backups, logs, embeddings and inference are not configured. Offline operation is not required.</span></div> : null;
}
