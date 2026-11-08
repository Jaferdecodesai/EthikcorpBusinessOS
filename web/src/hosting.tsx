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
  return cloudPreview ? <div className="hosting-notice" role="note"><strong>Cloud preview</strong><span>Your department records are separate for each browser. PM progress stays in this browser. Global hosting; UAE data residency is not configured.</span></div> : null;
}
