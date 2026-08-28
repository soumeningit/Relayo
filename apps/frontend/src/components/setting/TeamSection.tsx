import { useState } from "react";
import { Button, Input, Modal, TD, TH, THead, TR, TableWrapper } from "../ui";
import { toast } from "sonner";
import { FiUserPlus, FiTrash2 } from "react-icons/fi";

// Mock Data based on your OrganizationMember schema
const mockMembers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@quickcart.com",
    role: "OWNER",
    joinedAt: "2023-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@quickcart.com",
    role: "ADMIN",
    joinedAt: "2023-06-20T10:00:00Z",
  },
  {
    id: "3",
    name: "Bob Lee",
    email: "bob@quickcart.com",
    role: "MEMBER",
    joinedAt: "2023-09-10T10:00:00Z",
  },
];

export default function TeamSection() {
  const [members, setMembers] = useState(mockMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    // Mock add to list
    setMembers([
      ...members,
      {
        id: Date.now().toString(),
        name: "Pending Invitation",
        email: inviteEmail,
        role: inviteRole,
        joinedAt: new Date().toISOString(),
      },
    ]);
    setInviteOpen(false);
    setInviteEmail("");
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this organization.
          </p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <FiUserPlus aria-hidden="true" /> Invite Member
        </Button>
      </div>

      <div className="mt-6">
        <TableWrapper>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Role</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {members.map((member) => (
              <TR key={member.id}>
                <TD>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </TD>
                <TD>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.role === "OWNER"
                        ? "bg-indigo-500/10 text-indigo-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.role}
                  </span>
                </TD>
                <TD className="text-right">
                  {member.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <FiTrash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableWrapper>
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          They will receive an email to join your organization.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Email Address
          </label>
          <Input
            type="email"
            placeholder="developer@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Role
          </label>
          <select
            className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <Button fullWidth className="mt-5" onClick={handleInvite}>
          Send Invitation
        </Button>
      </Modal>
    </div>
  );
}
