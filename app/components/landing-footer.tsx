import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import {
  DIPLOM_AUTHOR_LINE,
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE,
  SITE_DISPLAY_NAME,
} from "@/lib/site-branding";

export function LandingFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/35 py-10 text-white/75">
      <div className={`${APP_CONTENT_MAX_CLASS} flex flex-col gap-8 md:flex-row md:justify-between`}>
        <div>
          <p className="text-sm font-semibold text-white">{SITE_DISPLAY_NAME}</p>
          <p className="mt-2 max-w-sm text-sm text-white/60">Колледж бизнеса и права</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-white/90">Контакты</p>
          <p className="mt-2">
            E-mail:{" "}
            <a className="text-cyan-300 hover:underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>
              {SITE_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-white/55">
            Тел.:{" "}
            <a className="text-cyan-300 hover:underline" href={`tel:${SITE_CONTACT_PHONE.replace(/\D/g, "")}`}>
              {SITE_CONTACT_PHONE}
            </a>
          </p>
        </div>
      </div>
      <div
        className={`${APP_CONTENT_MAX_CLASS} mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/45`}
      >
        {DIPLOM_AUTHOR_LINE}
      </div>
    </footer>
  );
}
