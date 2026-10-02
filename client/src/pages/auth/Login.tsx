import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AlertCircle, ArrowRight, ArrowLeft, Globe, Eye, EyeOff, Route, Users, ClipboardCheck } from "lucide-react";

export const Login: React.FC = () => {
  const { t, lang, toggleLang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try { await login(email.trim(), password); navigate("/"); }
    catch (err: any) { setError(err.response?.data?.error?.message || (ar ? "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور والاتصال." : "Could not sign in. Check your email, password and connection.")); }
    finally { setLoading(false); }
  };
  return (
    <main className="ops-login" dir={isRTL ? "rtl" : "ltr"}>
      <section className="ops-login-story">
        <div className="ops-login-brand"><img src="/brand/on-time-mark.png" alt="ON TIME" width="84" height="84" /><div><strong>ON TIME</strong><span>{ar ? "نقل الموظفين، بكل سهولة" : "Employee transport, made simple"}</span></div></div>
        <div className="ops-login-message"><span className="ops-eyebrow">{ar ? "كل رحلة تبدأ بتنظيم أفضل" : "A better day starts with a better journey"}</span><h1>{ar ? "فريقك يصل.\nوأنت مطمئن." : "Your people.\nIn the right place."}</h1><p>{ar ? "نظّم الركاب والمركبات والرحلات والحسابات في مساحة عمل واحدة واضحة." : "Bring passengers, vehicles, journeys and billing together in one clear workspace."}</p></div>
        <div className="ops-login-features">{[[Route, ar ? "تشغيل يومي واضح" : "Clear daily dispatch"], [Users, ar ? "موظفون وموردون في مكان واحد" : "People and partners together"], [ClipboardCheck, ar ? "حضور وحسابات مترابطة" : "Attendance connected to billing"]].map(([Icon, text]: any) => <div key={text}><Icon size={20} /><span>{text}</span></div>)}</div>
        <span className="ops-login-story-footer">{ar ? "أون تايم • إدارة نقل الموظفين" : "ON TIME • Employee transport management"}</span>
      </section>
      <section className="ops-login-entry" aria-label={ar ? "تسجيل الدخول" : "Sign in"}>
        <button type="button" onClick={toggleLang} className="ops-language ops-login-language"><Globe size={17} />{ar ? "English" : "العربية"}</button>
        <div className="ops-login-form-wrap">
          <img className="ops-login-mobile-mark" src="/brand/on-time-mark.png" alt="ON TIME" width="70" height="70" />
          <span className="ops-eyebrow">{ar ? "مرحباً بك في أون تايم" : "WELCOME TO ON TIME"}</span>
          <h2>{ar ? "كل شيء جاهز ليومك." : "Ready for the day."}</h2><p>{ar ? "سجّل الدخول إلى مساحة عملك للمتابعة." : "Sign in to your workspace to get started."}</p>
          {error && <div className="ops-notice error" role="alert"><AlertCircle size={20} /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} className="ops-login-form">
            <label className="ops-field"><span>{t("emailAddress")}</span><input type="email" autoComplete="username" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></label>
            <label className="ops-field"><span>{t("password")}</span><div className="ops-password-input"><input aria-label={t("password")} type={showPassword ? "text" : "password"} autoComplete="current-password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" aria-pressed={showPassword} aria-label={showPassword ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <button type="submit" disabled={loading} className="ops-button ops-login-submit">{loading ? t("authenticating") : t("signIn")}{isRTL ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}</button>
          </form>
          <p className="ops-login-support">{ar ? "تحتاج حساباً أو نسيت كلمة المرور؟ تواصل مع مسؤول النظام في شركتك." : "Need an account or forgot your password? Contact your company’s workspace administrator."}</p>
          {import.meta.env.VITE_DEMO_MODE === "true" && <div className="ops-login-demo"><p>{t("quickFill")}</p>{[["admin@tms.com", "admin123456", t("admin")], ["ops@tms.com", "ops123456", t("operations")], ["viewer@tms.com", "viewer123456", t("auditor")]].map(([mail, pass, title]) => <button type="button" key={mail} className="ops-button secondary" onClick={() => { setEmail(mail); setPassword(pass); setError(null); }}>{title}</button>)}</div>}
        </div>
      </section>
    </main>
  );
};
