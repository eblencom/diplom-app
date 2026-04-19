import { FOOTER_INNER_CLASS } from "@/lib/app-layout";
import {
  DIPLOM_AUTHOR_LINE,
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE,
  SITE_DISPLAY_NAME,
} from "@/lib/site-branding";

export function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/35 py-10 text-white/75">
      <div
        className={`${FOOTER_INNER_CLASS} flex flex-col items-center gap-8 text-center sm:flex-row sm:justify-center sm:gap-16 sm:text-left`}
      >
        <div className="sm:max-w-xs">
          <p className="text-sm font-semibold text-white">{SITE_DISPLAY_NAME}</p>
          <p className="mt-2 text-sm text-white/60">Колледж бизнеса и права</p>
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
      <div className={`${FOOTER_INNER_CLASS} mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/45`}>
        {DIPLOM_AUTHOR_LINE}
      </div>
    </footer>
  );
}
