import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreHorizontal, FiPauseCircle, FiPlayCircle, FiSearch } from "react-icons/fi";
import { toast } from "sonner";
import {
  EmptyState,
  Spinner,
  TD,
  TH,
  THead,
  TR,
  TableWrapper,
} from "../../components/ui";
import { DropdownMenu, MenuItem } from "../../components/ui/DropdownMenu";
import {
  OrgStatusBadge,
  PlanBadge,
} from "../../components/admin/badges";
import type { AdminOrganization } from "../../types/admin";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "../../types/pagination";
import { Pagination } from "../../components/dashboard/Pagination";
import { formatInr } from "../../lib/format";
import { formatDate } from "../../lib/time";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import * as adminService from "../../api/services/adminApi";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function AdminOrganizationsPage() {
  useDocumentMeta({
    title: "Organizations",
    description: "Manage every organization on the Relayo platform.",
  });

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminService
      .listAdminOrganizations(debouncedSearch || undefined, { page, pageSize })
      .then((result) => {
        if (cancelled) return;
        setOrganizations(result.items);
        setPagination(result.pagination);
        if (result.items.length === 0 && result.pagination.total > 0) {
          setPage(1);
        }
      })
      .catch((error) => {
        console.error("Error fetching organizations:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  const toggleStatus = async (org: AdminOrganization) => {
    const next = org.status === "active" ? "suspended" : "active";
    setBusyId(org.id);
    try {
      const updated = await adminService.updateOrganizationStatus(org.id, next);
      setOrganizations((prev) =>
        prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : prev,
      );
      toast.success(
        next === "suspended"
          ? `${org.name} was suspended.`
          : `${org.name} is active again.`,
      );
    } catch (error) {
      console.error("Error updating organization status:", error);
      toast.error("Could not update the organization status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Organizations
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every organization, plan and status on the platform.
          </p>
        </div>
        <label className="relative block">
          <FiSearch
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search name or slug…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-10 w-64 rounded-xl border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>
      </div>

      <div className="mt-6">
        {organizations === null ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-500" />
          </div>
        ) : organizations.length === 0 && pagination.total === 0 ? (
          <EmptyState
            icon={<FiSearch />}
            title="No organizations found"
            description={
              search
                ? `Nothing matches “${search}”. Try a different query.`
                : "Organizations appear here once they sign up."
            }
          />
        ) : (
          <>
            <TableWrapper>
            <THead>
              <TR>
                <TH>Organization</TH>
                <TH>Plan</TH>
                <TH>Members</TH>
                <TH>MRR</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {organizations.map((org) => (
                <TR
                  key={org.id}
                  onClick={() => navigate(`/admin/dashboard/organizations/${org.id}`)}
                >
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/12 text-xs font-bold uppercase text-indigo-500 dark:text-indigo-300">
                        {org.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {org.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          relayo.app/{org.slug}
                        </span>
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <PlanBadge plan={org.plan} />
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {org.memberCount}
                  </TD>
                  <TD className="font-mono text-xs">
                    {formatInr(org.mrr)}
                  </TD>
                  <TD>
                    <OrgStatusBadge status={org.status} />
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {formatDate(org.createdAt)}
                  </TD>
                  <TD className="text-right">
                    <DropdownMenu
                      trigger={
                        <button
                          aria-label={`Manage ${org.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <FiMoreHorizontal aria-hidden="true" />
                        </button>
                      }
                    >
                      {(close) => (
                        <>
                          <MenuItem
                            onClick={() => {
                              close();
                              navigate(
                                `/admin/dashboard/organizations/${org.id}`,
                              );
                            }}
                          >
                            View details
                          </MenuItem>
                          <MenuItem
                            disabled={busyId === org.id}
                            icon={
                              org.status === "active" ? (
                                <FiPauseCircle size={15} />
                              ) : (
                                <FiPlayCircle size={15} />
                              )
                            }
                            danger={org.status === "active"}
                            onClick={() => {
                              close();
                              toggleStatus(org);
                            }}
                          >
                            {org.status === "active" ? "Suspend" : "Reactivate"}
                          </MenuItem>
                        </>
                      )}
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableWrapper>
          {pagination.total > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              hasMore={pagination.hasMore}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminOrganizationsPage;