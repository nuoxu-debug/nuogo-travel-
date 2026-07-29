import {
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import { useDialogFocus } from "../hooks/useDialogFocus.js";

function activeInvitations(invitations) {
  return invitations.filter(({ status }) => status === "pending");
}

export default function CollaborationDrawer({
  tripId,
  open,
  onClose,
  access,
  members,
  onMembersChanged,
  membersLoading,
  membersError
}) {
  const { t } = useLanguage();
  const animate = useAnime();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const rowsRef = useRef(null);
  const [invitations, setInvitations] = useState([]);
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(null);
  const isOwner = Boolean(access?.isOwner);

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onClose
  });

  useEffect(() => {
    if (!open || !isOwner) return;
    setLoadingInvitations(true);
    setError("");
    apiRequest(`/trips/${tripId}/invitations`)
      .then((body) => setInvitations(body.invitations ?? []))
      .catch(() => setError(t("collaboration.requestFailed")))
      .finally(() => setLoadingInvitations(false));
  }, [isOwner, open, t, tripId]);

  useEffect(() => {
    if (!open || !members.length) return;
    animate({
      targets: rowsRef.current?.querySelectorAll("[data-member-row]"),
      translateX: [10, 0],
      opacity: [0, 1],
      delay: (_target, index) => index * 35,
      duration: 220,
      easing: "easeOutExpo"
    });
  }, [animate, members, open]);

  if (!open) return null;

  async function createInvitation() {
    setBusy("invite");
    setError("");
    setInviteUrl("");
    setCopied(false);
    try {
      const body = await apiRequest(`/trips/${tripId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ role: inviteRole })
      });
      setInviteUrl(body.url);
      setInvitations((current) => [body.invitation, ...current]);
    } catch {
      setError(t("collaboration.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  async function copyInvitation() {
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
  }

  async function changeRole(member, role) {
    setBusy(`member-${member.id}`);
    setError("");
    try {
      await apiRequest(`/trips/${tripId}/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      await onMembersChanged();
    } catch {
      setError(t("collaboration.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  async function removeMember(member) {
    setBusy(`member-${member.id}`);
    setError("");
    try {
      await apiRequest(`/trips/${tripId}/members/${member.id}`, {
        method: "DELETE"
      });
      setConfirming(null);
      await onMembersChanged();
    } catch {
      setError(t("collaboration.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  async function revokeInvitation(invitation) {
    setBusy(`invitation-${invitation.id}`);
    setError("");
    try {
      await apiRequest(`/trips/${tripId}/invitations/${invitation.id}`, {
        method: "DELETE"
      });
      setConfirming(null);
      setInvitations((current) => current.filter(({ id }) => id !== invitation.id));
    } catch {
      setError(t("collaboration.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  const pending = activeInvitations(invitations);

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-ink/35" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("collaboration.title")}
        tabIndex={-1}
        className="ml-auto flex h-[100dvh] w-full max-w-[430px] flex-col border-l border-ink/10 bg-paper shadow-[-20px_0_60px_rgba(29,29,31,.16)]"
      >
        <header className="flex min-h-[72px] items-center justify-between border-b border-ink/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-jade/12 text-jade">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold">{t("collaboration.title")}</h2>
              <p className="text-sm text-ink/70">
                {t("collaboration.memberCount").replace("{count}", members.length)}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("collaboration.close")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink/65 transition-colors hover:bg-ink/5 hover:text-ink active:scale-[.98]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isOwner && (
            <section className="border-b border-ink/10 px-5 py-5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-lake" />
                <h3 className="font-extrabold">{t("collaboration.inviteSomeone")}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                {t("collaboration.inviteBody")}
              </p>
              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-bold">{t("collaboration.accessLabel")}</legend>
                <div className="grid grid-cols-2 rounded-lg bg-mist p-1">
                  {["editor", "viewer"].map((role) => (
                    <label
                      key={role}
                      className={`cursor-pointer rounded-md px-3 py-2.5 text-center text-sm font-bold transition-colors ${
                        inviteRole === role ? "bg-white text-ink shadow-sm" : "text-ink/65"
                      }`}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        value={role}
                        checked={inviteRole === role}
                        onChange={() => setInviteRole(role)}
                        className="sr-only"
                      />
                      {t(`collaboration.roles.${role}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                onClick={createInvitation}
                disabled={busy === "invite"}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "invite"
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <Link2 className="h-4 w-4" />}
                {t("collaboration.createInvitation")}
              </button>
              {inviteUrl && (
                <div className="mt-3 flex overflow-hidden rounded-lg border border-ink/15 bg-white">
                  <input
                    readOnly
                    value={inviteUrl}
                    aria-label={t("collaboration.invitationUrl")}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink"
                  />
                  <button
                    type="button"
                    onClick={copyInvitation}
                    aria-label={t("collaboration.copyInvitation")}
                    className="grid h-12 w-12 shrink-0 place-items-center bg-ink text-white"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </section>
          )}

          {error && (
            <div role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <section className="px-5 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-extrabold">{t("collaboration.activeMembers")}</h3>
              <button
                type="button"
                onClick={() => onMembersChanged().catch(() => {})}
                aria-label={t("collaboration.refreshMembers")}
                className="grid h-11 w-11 place-items-center rounded-lg text-jade hover:bg-jade/8"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {membersLoading ? (
              <div
                role="status"
                className="rounded-lg bg-mist px-4 py-5 text-center"
              >
                <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-jade" />
                <p className="mt-2 text-sm font-bold text-ink">
                  {t("collaboration.loadingMembers")}
                </p>
              </div>
            ) : membersError ? (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-4 text-red-900">
                <p className="text-sm font-bold">{t("collaboration.membersLoadFailed")}</p>
                <button
                  type="button"
                  onClick={() => onMembersChanged().catch(() => {})}
                  className="mt-2 min-h-11 rounded-lg border border-red-900/25 px-3 text-sm font-bold hover:bg-red-100"
                >
                  {t("collaboration.retryMembers")}
                </button>
              </div>
            ) : !members.length ? (
              <div className="rounded-lg bg-mist px-4 py-6 text-center">
                <p className="font-bold">{t("collaboration.emptyMembers")}</p>
                <p className="mt-1 text-sm text-ink/70">{t("collaboration.emptyMembersBody")}</p>
              </div>
            ) : (
              <div ref={rowsRef} className="divide-y divide-ink/10">
                {members.map((member) => {
                  const owner = member.role === "owner";
                  const memberBusy = busy === `member-${member.id}`;
                  const isConfirming = confirming === `member-${member.id}`;
                  return (
                    <div key={member.id} data-member-row className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-xs font-extrabold text-white">
                          {String(member.name || "?").trim().slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold">{member.name}</p>
                          <p className="truncate text-xs text-ink/70">
                            {t("collaboration.activeStatus")}
                          </p>
                        </div>
                        {isOwner && !owner ? (
                          <select
                            value={member.role}
                            onChange={(event) => changeRole(member, event.target.value)}
                            disabled={memberBusy}
                            aria-label={t("collaboration.roleFor").replace("{name}", member.name)}
                            className="min-h-11 rounded-lg border border-ink/15 bg-white px-2 text-sm font-bold"
                          >
                            <option value="editor">{t("collaboration.roles.editor")}</option>
                            <option value="viewer">{t("collaboration.roles.viewer")}</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-ink/70">
                            {t(`collaboration.roles.${member.role}`)}
                          </span>
                        )}
                      </div>
                      {isOwner && !owner && (
                        <div className="mt-2 flex justify-end">
                          {isConfirming ? (
                            <div className="flex items-center gap-2" role="group" aria-label={t("collaboration.confirmRemoval")}>
                              <button
                                type="button"
                                onClick={() => setConfirming(null)}
                                className="min-h-11 rounded-lg px-3 text-sm font-bold text-ink/65 hover:bg-ink/5"
                              >
                                {t("collaboration.cancel")}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMember(member)}
                                disabled={memberBusy}
                                className="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-bold text-white disabled:opacity-60"
                              >
                                {t("collaboration.confirmRemove")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirming(`member-${member.id}`)}
                              aria-label={t("collaboration.removeNamed").replace("{name}", member.name)}
                              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("collaboration.remove")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {isOwner && (
            <section className="border-t border-ink/10 px-5 py-5">
              <h3 className="font-extrabold">{t("collaboration.pendingInvitations")}</h3>
              {loadingInvitations ? (
                <div className="mt-3 grid gap-2" aria-label={t("collaboration.loadingInvitations")}>
                  <div className="h-14 animate-pulse rounded-lg bg-mist" />
                  <div className="h-14 animate-pulse rounded-lg bg-mist" />
                </div>
              ) : !pending.length ? (
                <p className="mt-2 text-sm text-ink/70">{t("collaboration.noPendingInvitations")}</p>
              ) : (
                <div className="mt-2 divide-y divide-ink/10">
                  {pending.map((invitation) => {
                    const invitationBusy = busy === `invitation-${invitation.id}`;
                    const isConfirming = confirming === `invitation-${invitation.id}`;
                    const role = t(`collaboration.roles.${invitation.role}`);
                    return (
                      <div key={invitation.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                        <div>
                          <p className="text-sm font-bold">{role}</p>
                          <p className="text-xs text-ink/70">{t("collaboration.waitingToJoin")}</p>
                        </div>
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setConfirming(null)} className="min-h-11 px-2 text-sm font-bold text-ink/65">
                              {t("collaboration.cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={invitationBusy}
                              onClick={() => revokeInvitation(invitation)}
                              className="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {t("collaboration.confirmRevoke")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirming(`invitation-${invitation.id}`)}
                            aria-label={t("collaboration.revokeNamed").replace("{role}", role)}
                            className="min-h-11 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50"
                          >
                            {t("collaboration.revoke")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
