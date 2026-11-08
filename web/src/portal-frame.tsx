import React from "react";
import catalog from "../shared/departments.json";

export function PortalFrame({ hash, children }: { hash: string; children: React.ReactNode }) {
  const clean = hash.replace(/^#/, "");
  const place = clean.startsWith("departments") ? "departments" : clean.startsWith("knowledge") ? "knowledge" : clean.startsWith("ceo") ? "ceo" : "pm";
  const dept = clean.split("/")[1] || "";
  const title = place === "ceo" ? "CEO desk" : place === "knowledge" ? "Knowledge" : place === "departments" ? (catalog.find((d) => d.id === dept)?.name || (dept === "runtime" ? "Runtime" : "Departments")) : "Formation";
  return <div className="portal">
    <aside className="side" aria-label="Places">
      <a className="brand" href="#ceo"><span className="mark">AQ</span><span><b>Aqion SuperbrainOS</b><small>Businessbots · pilot</small></span></a>
      <div className="navlabel">Operating picture</div>
      <a className={place === "ceo" ? "nav on" : "nav"} href="#ceo" aria-current={place === "ceo" ? "page" : undefined}>CEO desk</a>
      <a className={place === "pm" ? "nav on" : "nav"} href="#pm" aria-current={place === "pm" ? "page" : undefined}>Formation journey</a>
      <a className={place === "knowledge" ? "nav on" : "nav"} href="#knowledge" aria-current={place === "knowledge" ? "page" : undefined}>Knowledge</a>
      <div className="navlabel">Departments <span className="count">9</span></div>
      <nav aria-label="Departments">{catalog.map((deptItem) => <a key={deptItem.id} className={dept === deptItem.id ? "nav on" : "nav"} href={`#departments/${deptItem.id}/dashboard`} aria-current={dept === deptItem.id ? "page" : undefined}>{deptItem.short}<span className="count">{deptItem.code}</span></a>)}</nav>
      <a className={dept === "runtime" ? "nav on" : "nav"} href="#departments/runtime">Runtime</a>
      <div className="sidefoot">Demo records and local templates. Sim, Lobu, retrieval and the UAE data plane are not connected. Older autonomous routines stay paused.</div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <div className="ctx"><span>Ethikcorp pilot</span><span aria-hidden="true">/</span><b>{title}</b></div>
        <div className="pills"><span className="pill a"><i />Demo · not live integrations</span><span className="pill r"><i />UAE data plane unverified</span></div>
      </header>
      <div className="page">{children}</div>
    </div>
  </div>;
}
