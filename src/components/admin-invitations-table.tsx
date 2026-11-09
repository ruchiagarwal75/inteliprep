import type { BetaInvite } from "@/lib/admin-invites";
import { AdminTime } from "@/components/admin-format";
import { AdminApprovalEmail } from "@/components/admin-approval-email";

export function AdminInvitationsTable({
  invites,
  busy,
  onChange,
  onRetry,
}: {
  invites: BetaInvite[];
  busy: boolean;
  onChange: (email: string, approved: boolean) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Google email invitations and current beta access
        </caption>
        <thead>
          <tr>
            {[
              "Email",
              "Access",
              "Updated (UTC)",
              "Approval email",
              "Action",
            ].map((label) => (
              <th scope="col" className="border-b p-3" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.email}>
              <td className="border-b p-3">{invite.email}</td>
              <td className="border-b p-3">
                {invite.approved ? "Approved" : "Revoked"}
              </td>
              <td className="border-b p-3">
                <AdminTime value={invite.updatedAt} />
              </td>
              <td className="border-b p-3">
                <AdminApprovalEmail
                  approved={invite.approved}
                  notification={invite.notification}
                  busy={busy}
                  onRetry={onRetry}
                />
              </td>
              <td className="border-b p-3">
                <button
                  type="button"
                  disabled={busy}
                  className="practice-secondary"
                  aria-label={`${invite.approved ? "Revoke" : "Approve"} access for ${invite.email}`}
                  onClick={() => onChange(invite.email, !invite.approved)}
                >
                  {invite.approved ? "Revoke" : "Approve"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
