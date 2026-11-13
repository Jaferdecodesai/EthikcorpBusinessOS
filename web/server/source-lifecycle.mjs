export function sourceKey({ sourceId, name }) {
  return JSON.stringify([sourceId, name.normalize("NFKC").toLowerCase()]);
}

export function latestWithdrawal(brain, source) {
  return (brain.sourceWithdrawals || []).findLast((event) => event.key === sourceKey(source));
}

export function withdrawSource(brain, input, actor) {
  const selected = (brain.documents || []).find((doc) => doc.id === input?.documentId && doc.handoffId);
  if (!selected) throw new Error("That indexed source no longer exists. Refresh the source list.");
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason || reason.length > 500) throw new Error("Record a withdrawal reason of up to 500 characters.");
  const key = sourceKey(selected);
  const documentIds = new Set(brain.documents.filter((doc) => doc.handoffId && sourceKey(doc) === key).map(({ id }) => id));
  const receipts = (brain.handoffs || []).filter((file) => file.stage === "intake" && sourceKey(file) === key);
  const event = {
    key,
    name: selected.name,
    sourceId: selected.sourceId,
    reason,
    actor,
    at: new Date().toISOString(),
    revisions: documentIds.size,
    previousApprovals: [...new Set([...receipts.map(({ approvalRef }) => approvalRef), ...(latestWithdrawal(brain, selected)?.previousApprovals || [])].filter(Boolean))]
  };
  return {
    ...brain,
    documents: brain.documents.filter(({ id }) => !documentIds.has(id)),
    chunks: brain.chunks.filter(({ documentId }) => !documentIds.has(documentId)),
    handoffs: (brain.handoffs || []).map((file) => file.stage === "intake" && sourceKey(file) === key
      ? { ...file, indexed: false, withdrawnAt: event.at, restoring: false } : file),
    sourceWithdrawals: [...(brain.sourceWithdrawals || []), event]
  };
}
