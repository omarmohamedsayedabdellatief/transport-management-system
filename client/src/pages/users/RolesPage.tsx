import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { Modal } from "../../components/ui/Modal";
import {
  QueryNotice,
  MutationNotice,
} from "../../components/ui/MutationNotice";

type Role = {
  id: string;
  code?: string;
  name: string;
  description: string;
  permissions: string[];
  revision: number;
  userCount: number;
};
type Catalog = {
  key: string;
  group: string;
  label: string;
  action: string;
  title: string;
};
export function RolesPage() {
  const { lang } = useLanguage(),
    ar = lang === "ar",
    { can, refreshUser } = useAuth(),
    qc = useQueryClient();
  const [editing, setEditing] = useState<Role | null>(null),
    [open, setOpen] = useState(false);
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [permissions, setPermissions] = useState<string[]>([]);
  const query = useQuery<{
    roles: Role[];
    catalog: Catalog[];
    dependencies: Record<string, string[]>;
  }>({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles")).data.data,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (editing)
        await api.put("/roles/" + editing.id, {
          name,
          description,
          permissions,
          revision: editing.revision,
        });
      else await api.post("/roles", { name, description, permissions });
    },
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["roles"] });
      await qc.invalidateQueries({ queryKey: ["role-options"] });
      await qc.invalidateQueries({ queryKey: ["users"] });
      await refreshUser();
    },
  });
  const begin = (role: Role | null) => {
    save.reset();
    setEditing(role);
    setName(role?.name || "");
    setDescription(role?.description || "");
    setPermissions(role?.permissions || []);
    setOpen(true);
  };
  const toggle = (key: string, checked: boolean) => {
    const next = new Set(permissions),
      deps = query.data?.dependencies || {};
    if (checked) {
      const add = (p: string) => {
        if (next.has(p)) return;
        next.add(p);
        (deps[p] || []).forEach(add);
      };
      add(key);
    } else {
      next.delete(key);
      let changed = true;
      while (changed) {
        changed = false;
        for (const p of next)
          if ((deps[p] || []).some((d) => !next.has(d))) {
            next.delete(p);
            changed = true;
          }
      }
    }
    setPermissions([...next]);
  };
  const groups = [...new Set(query.data?.catalog.map((p) => p.group) || [])];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {ar ? "الأدوار والصلاحيات" : "Roles and permissions"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {ar
              ? "أنشئ دورًا وحدد صلاحياته، أو عدّل دورًا افتراضيًا. التعديل يسري على جميع مستخدمي الدور."
              : "Create roles or edit default roles. Changes apply to everyone assigned to the role."}
          </p>
        </div>
        <button className="ops-button" onClick={() => begin(null)}>
          {ar ? "إضافة دور جديد" : "Add role"}
        </button>
      </div>
      <QueryNotice failed={query.isError} retry={query.refetch} />
      <p className="rounded-xl border bg-blue-50 p-3 text-sm">
        {ar
          ? "صلاحيات الدور وتعيين الشركات يعملان معًا. الحسابات والإدارة العامة تحتاج نطاق كل الشركات. إضافة صلاحية تختار متطلباتها تلقائيًا."
          : "Role permissions and assigned-company restrictions both apply. Global accounting and administration require all-company access. Dependencies are selected automatically."}
      </p>
      {query.isLoading && <p>{ar ? "جاري التحميل…" : "Loading…"}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {query.data?.roles.map((role) => (
          <article key={role.id} className="ops-panel ops-padded space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-bold">{role.name}</h2>
              <span className="text-xs text-slate-500">
                {role.code
                  ? ar
                    ? "دور افتراضي"
                    : "Default role"
                  : ar
                    ? "دور مخصص"
                    : "Custom role"}
              </span>
            </div>
            <p>{role.description}</p>
            <p className="text-sm">
              {role.permissions.length} {ar ? "صلاحية" : "permissions"} ·{" "}
              {role.userCount} {ar ? "مستخدم" : "users"}
            </p>
            <button
              className="ops-button secondary"
              disabled={role.permissions.some((p) => !can(p))}
              onClick={() => begin(role)}
            >
              {ar ? "تعديل الصلاحيات" : "Edit permissions"}
            </button>
          </article>
        ))}
      </div>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? ar
              ? "تعديل الدور وصلاحياته"
              : "Edit role and permissions"
            : ar
              ? "إضافة دور جديد"
              : "Add role"
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <MutationNotice mutations={[save]} />
          <label className="block">
            {ar ? "اسم الدور" : "Role name"}
            <input
              required
              minLength={2}
              maxLength={100}
              className="w-full border rounded-xl p-2 mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            {ar ? "الوصف (اختياري)" : "Description (optional)"}
            <textarea
              maxLength={500}
              className="w-full border rounded-xl p-2 mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {editing && (
            <p className="text-sm text-amber-800">
              {ar
                ? `سيُطبق التعديل على ${editing.userCount} مستخدم. تبقى الأدوار الأخرى كما هي.`
                : `This change affects ${editing.userCount} users.`}
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {groups.map((group) => (
              <fieldset key={group} className="border rounded-xl p-3">
                <legend className="font-bold">
                  {ar
                    ? query.data?.catalog.find((p) => p.group === group)?.label
                    : group}
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {query.data?.catalog
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <label key={p.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.includes(p.key)}
                          disabled={!can(p.key)}
                          onChange={(e) => toggle(p.key, e.target.checked)}
                        />
                        {ar ? p.title : p.action}
                      </label>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {ar
              ? "حذف صلاحية يزيل أيضًا الصلاحيات التي تعتمد عليها. إدارة الأدوار تسمح بتعديل أدوار لا تتجاوز صلاحياتك الحالية."
              : "Removing a permission also removes dependent permissions. You can only grant permissions you hold."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="ops-button secondary"
              onClick={() => setOpen(false)}
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button className="ops-button" disabled={save.isPending}>
              {save.isPending
                ? "…"
                : ar
                  ? "حفظ الدور والصلاحيات"
                  : "Save role and permissions"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
