import { FOOTER_INNER_CLASS } from "@/lib/app-layout";
import {
  DIPLOM_AUTHOR_LINE,
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE,
  SITE_DISPLAY_NAME,
} from "@/lib/site-branding";

export function LandingFooter() {
  return (
    <footer className="relative z-10 -mt-px shrink-0 border-t border-white/25 bg-black/40 pb-[max(1rem,env(safe-area-inset-bottom))] text-white/75">
      <div
        className={`${FOOTER_INNER_CLASS} grid gap-5 pt-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8 sm:pt-6 sm:text-left`}
      >
        <div>
          <p className="text-sm font-semibold text-white">{SITE_DISPLAY_NAME}</p>
          <p className="mt-1.5 text-sm text-white/60">Колледж бизнеса и права</p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-medium text-white/90">Контакты</p>
          <p className="mt-2">
            <a className="text-cyan-300 hover:underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>
              {SITE_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1">
            <a className="text-cyan-300 hover:underline" href={`tel:${SITE_CONTACT_PHONE.replace(/\D/g, "")}`}>
              {SITE_CONTACT_PHONE}
            </a>
          </p>
        </div>
      </div>
      <div
        className={`${FOOTER_INNER_CLASS} mt-5 border-t border-white/18 pt-4 text-center text-xs text-white/45 sm:mt-6 sm:pt-5 sm:text-left`}
      >
        {DIPLOM_AUTHOR_LINE}
      </div>
    </footer>
  );
}
