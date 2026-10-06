import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  MutationNotice,
  QueryNotice,
} from "../../components/ui/MutationNotice";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import type { User, UserRole, UserStatus, Client } from "../../types";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Plus } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export const UsersPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { can } = useAuth();
  const roleOptions = useQuery<{ id: string; name: string; code?: string }[]>({
    queryKey: ["role-options"],
    queryFn: async () => (await api.get("/roles/options")).data.data,
  });
  const [roleUser, setRoleUser] = useState<User | null>(null),
    [newRoleId, setNewRoleId] = useState(""),
    [roleScope, setRoleScope] = useState(false),
    [roleCompanies, setRoleCompanies] = useState<string[]>([]);
  const changeRole = useMutation({
    mutationFn: () =>
      api.patch(`/users/${roleUser!.id}/role`, {
        roleId: newRoleId,
        companyScopeEnabled: roleScope,
        companyIds: roleCompanies,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRoleUser(null);
    },
  });

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assigning, setAssigning] = useState<User | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const companies = useQuery<Client[]>({
    queryKey: ["clients", "user-assignment"],
    queryFn: async () => (await api.get("/clients")).data.data,
  });
  const assignCompanies = useMutation({
    mutationFn: () =>
      api.patch(`/users/${assigning!.id}/companies`, {
        companyIds: assignedIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setAssigning(null);
    },
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    companyScopeEnabled: false,
    companyIds: [] as string[],
  });

  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useQuery<{ data: User[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { role, ...data } = payload;
      return api.post("/users", { ...data, roleId: role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      return api.patch(`/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const users = usersData?.data || [];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return lang === "ar" ? "المالك" : "Owner";
      case "OPERATIONS_MANAGER":
        return t("operations");
      case "VIEWER":
        return lang === "ar" ? "مستخدم عادي" : "Regular user";
      case "ACCOUNTANT":
        return lang === "ar" ? "محاسب" : "Accountant";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateStatusMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("systemUserManagement")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("userManagementSubtitle")}
          </p>
        </div>
        {can("roles.manage") && (
          <Link to="/roles" className="ops-button secondary">
            {lang === "ar"
              ? "إدارة الأدوار والصلاحيات"
              : "Manage roles and permissions"}
          </Link>
        )}
        {can("users.manage") && (
          <button
            onClick={() => {
              setFormData({
                fullName: "",
                email: "",
                password: "",
                phone: "",
                role: "",
                companyScopeEnabled: false,
                companyIds: [],
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addUser")}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t("user")}</th>
                  <th className="py-3 px-4">{t("contact")}</th>
                  <th className="py-3 px-4">{t("assignedRole")}</th>
                  <th className="py-3 px-4">
                    {lang === "ar" ? "الشركات المعيّنة" : "Assigned companies"}
                  </th>
                  <th className="py-3 px-4">{t("accountStatus")}</th>
                  <th className="py-3 px-4">{t("registeredDate")}</th>
                  <th className="py-3 px-4 text-right rtl:text-left">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 break-words break-all">
                        {u.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 break-words break-all">
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {u.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {u.assignedRole?.name ||
                          roleOptions.data?.find((r) => r.code === u.role)
                            ?.name ||
                          getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {u.companyScopeEnabled
                        ? (u.companyIds || [])
                            .map(
                              (id) =>
                                companies.data?.find((c) => c.id === id)
                                  ?.companyName || "—",
                            )
                            .join("، ") ||
                          (lang === "ar" ? "لا توجد شركات" : "No companies")
                        : lang === "ar"
                          ? "كل الشركات"
                          : "All companies"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={u.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right rtl:text-left">
                      {can("users.manage") && (
                        <button
                          className="block mb-2 text-blue-700"
                          onClick={() => {
                            changeRole.reset();
                            setRoleUser(u);
                            setNewRoleId(u.roleId || u.role);
                            setRoleScope(u.companyScopeEnabled || u.roleId === "VIEWER" || (!u.roleId && u.role === "VIEWER"));
                            setRoleCompanies(u.companyIds || []);
                          }}
                        >
                          {lang === "ar" ? "تغيير الدور" : "Change role"}
                        </button>
                      )}
                      {can("users.manage") && u.role === "VIEWER" && (
                        <button
                          className="block mb-2 text-blue-700"
                          onClick={() => {
                            setAssigning(u);
                            setAssignedIds(u.companyIds || []);
                            assignCompanies.reset();
                          }}
                        >
                          {lang === "ar" ? "تعيين الشركات" : "Assign companies"}
                        </button>
                      )}
                      {can("users.manage") &&
                        (u.status === "ACTIVE" ? (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: u.id,
                                status: "INACTIVE",
                              })
                            }
                            className="text-xs font-medium text-rose-600 hover:text-rose-700"
                          >
                            {t("deactivate")}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: u.id,
                                status: "ACTIVE",
                              })
                            }
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            {t("activate")}
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("createSystemUser")}
        subtitle={t("provisionSubtitle")}
      >
        <MutationNotice mutations={[createMutation, updateStatusMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t("fullName")}
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="e.g. Sara Nabil"
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t("emailAddress")}
            </label>
            <input
              type="email"
              required
              maxLength={100}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="sara@tms.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t("initialPassword")}
              </label>
              <input
                type="password"
                required
                minLength={10}
                maxLength={100}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t("phone")}
              </label>
              <input
                type="tel"
                pattern="[0-9+ ]*"
                maxLength={20}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t("assignedRole")}
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value,
                  companyScopeEnabled:
                    e.target.value === "VIEWER"
                      ? true
                      : formData.companyScopeEnabled,
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">
                {lang === "ar" ? "اختر الدور" : "Choose role"}
              </option>
              {(roleOptions.data || []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex gap-2">
            <input
              type="checkbox"
              disabled={formData.role === "VIEWER"}
              checked={formData.companyScopeEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyScopeEnabled: e.target.checked,
                })
              }
            />
            {lang === "ar"
              ? "تقييد الوصول بشركات محددة"
              : "Restrict access to assigned companies"}
          </label>
          {formData.companyScopeEnabled && (
            <>
              <QueryNotice
                failed={companies.isError}
                retry={companies.refetch}
              />
              <CompanyPicker
                companies={companies.data || []}
                value={formData.companyIds}
                onChange={(companyIds) =>
                  setFormData({ ...formData, companyIds })
                }
                ar={lang === "ar"}
              />
            </>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.role ||
                roleOptions.isLoading ||
                roleOptions.isError ||
                (formData.companyScopeEnabled &&
                  (!formData.companyIds.length ||
                    companies.isLoading ||
                    companies.isError))
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {createMutation.isPending ? t("creating") : t("createAccount")}
            </button>
          </div>
        </form>
      </Modal>
      {roleUser && (
        <Modal
          isOpen
          onClose={() => setRoleUser(null)}
          title={lang === "ar" ? "تغيير دور المستخدم" : "Change user role"}
          subtitle={roleUser.fullName}
        >
          <MutationNotice mutations={[changeRole]} />
          <label className="block">
            {lang === "ar" ? "الدور" : "Role"}
            <select
              className="w-full border rounded-xl p-3 mt-2"
              value={newRoleId}
              onChange={(e) => {
                setNewRoleId(e.target.value);
                if (e.target.value === "VIEWER") setRoleScope(true);
              }}
            >
              <option value="">
                {lang === "ar" ? "اختر الدور" : "Choose role"}
              </option>
              {roleOptions.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex gap-2 my-4">
            <input
              type="checkbox"
              disabled={newRoleId === "VIEWER"}
              checked={roleScope}
              onChange={(e) => setRoleScope(e.target.checked)}
            />
            {lang === "ar"
              ? "تقييد الوصول بشركات محددة"
              : "Restrict access to assigned companies"}
          </label>
          {roleScope && (
            <CompanyPicker
              companies={companies.data || []}
              value={roleCompanies}
              onChange={setRoleCompanies}
              ar={lang === "ar"}
            />
          )}
          <p className="text-sm text-slate-500 my-3">
            {lang === "ar"
              ? "تغيير الدور ينهي جلسات المستخدم الحالية."
              : "Changing the role ends the user’s current sessions."}
          </p>
          <button
            className="ops-button"
            disabled={
              changeRole.isPending ||
              !newRoleId ||
              (roleScope && !roleCompanies.length)
            }
            onClick={() => changeRole.mutate()}
          >
            {lang === "ar" ? "حفظ الدور" : "Save role"}
          </button>
        </Modal>
      )}
      {assigning && (
        <Modal
          isOpen
          onClose={() => setAssigning(null)}
          title={
            lang === "ar" ? "تعيين شركات المستخدم" : "Assign user companies"
          }
          subtitle={assigning.fullName}
        >
          <MutationNotice mutations={[assignCompanies]} />
          <QueryNotice failed={companies.isError} retry={companies.refetch} />
          <CompanyPicker
            companies={companies.data || []}
            value={assignedIds}
            onChange={setAssignedIds}
            ar={lang === "ar"}
          />
          <button
            className="ops-button mt-4"
            disabled={
              assignCompanies.isPending ||
              !assignedIds.length ||
              companies.isError
            }
            onClick={() => assignCompanies.mutate()}
          >
            {lang === "ar" ? "حفظ الشركات" : "Save companies"}
          </button>
        </Modal>
      )}
    </div>
  );
};

function CompanyPicker({
  companies,
  value,
  onChange,
  ar,
}: {
  companies: Client[];
  value: string[];
  onChange: (ids: string[]) => void;
  ar: boolean;
}) {
  const [search, setSearch] = useState("");
  return (
    <fieldset className="border rounded-xl p-3 space-y-3">
      <legend className="font-bold">
        {ar ? "الشركات المسموح بها" : "Allowed companies"}
      </legend>
      <p className="text-sm text-slate-500">
        {ar
          ? "اختر شركة أو أكثر. تعمل صلاحيات الدور داخل نطاق هذه الشركات. الحسابات والإدارة العامة تتطلب نطاق كل الشركات."
          : "Role permissions apply within these companies. Global accounting and administration require all-company access."}
      </p>
      <input
        aria-label={ar ? "بحث عن شركة" : "Search companies"}
        placeholder={ar ? "بحث عن شركة…" : "Search companies…"}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg p-2"
      />
      <div className="max-h-56 overflow-y-auto space-y-2">
        {companies
          .filter((c) =>
            c.companyName.toLowerCase().includes(search.trim().toLowerCase()),
          )
          .map((c) => (
            <label
              className="flex gap-3 items-center border rounded-lg p-2"
              key={c.id}
            >
              <input
                type="checkbox"
                checked={value.includes(c.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, c.id]
                      : value.filter((id) => id !== c.id),
                  )
                }
              />
              {c.companyName}
            </label>
          ))}
      </div>
      <p className="text-sm">
        {ar
          ? `تم اختيار ${value.length} شركة`
          : `${value.length} companies selected`}
      </p>
    </fieldset>
  );
}
