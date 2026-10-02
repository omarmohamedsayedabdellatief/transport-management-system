import { useState } from "react";
import { Notice } from "../../pages/operations/ui";
import { useLanguage } from "../../contexts/LanguageContext";

/** Display the latest attempted save, including field validation, inside forms. */
export function MutationNotice({ mutations }: { mutations: any[] }) {
  const { lang } = useLanguage();
  const [mountedAt] = useState(Date.now);
  const latest = [...mutations].sort((a, b) => b.submittedAt - a.submittedAt)[0];
  if (!latest?.isError || latest.submittedAt < mountedAt) return null;
  const error = latest.error?.response?.data?.error;
  return <Notice error><span>{error?.message || (lang === "ar" ? "تعذر الحفظ. تحقق من الاتصال وحاول مرة أخرى." : "Could not save. Check your connection and try again.")}</span>{Array.isArray(error?.details) && <ul>{error.details.map((d: any, i: number) => <li key={i}>{d.field}: {d.message}</li>)}</ul>}</Notice>;
}

export function QueryNotice({ failed, retry }: { failed: boolean; retry: () => unknown }) {
  const { lang } = useLanguage();
  if (!failed) return null;
  return <Notice error>{lang === "ar" ? "تعذر تحميل البيانات. تحقق من الاتصال." : "Could not load records. Check your connection."} <button onClick={retry}>{lang === "ar" ? "حاول مرة أخرى" : "Try again"}</button></Notice>;
}
