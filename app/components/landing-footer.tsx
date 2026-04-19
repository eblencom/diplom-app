import {
  DIPLOM_AUTHOR_LINE,
  SITE_CONTACT_EMAIL,
  SITE_DISPLAY_NAME,
} from "@/lib/site-branding";

export function LandingFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/35 py-10 text-white/75">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 md:flex-row md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{SITE_DISPLAY_NAME}</p>
          <p className="mt-2 max-w-sm text-sm text-white/60">
            Учебный проект веб-платформы для работы с новостями публичных компаний и
            интрадей-ценами с MOEX.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-white/90">Контакты</p>
          <p className="mt-2">
            E-mail:{" "}
            <a className="text-cyan-300 hover:underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>
              {SITE_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-white/55">Тел.: +7 (000) 000-00-00 (заглушка)</p>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-5xl border-t border-white/10 px-4 pt-6 text-center text-xs text-white/45">
        {DIPLOM_AUTHOR_LINE}
      </div>
    </footer>
  );
}
