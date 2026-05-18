#!/usr/bin/env python3
"""Regenerate CHB HTML prototypes."""
from pathlib import Path

CHB = Path(__file__).resolve().parent.parent / "CHB"
D = "<" + "div"
CD = "</" + "div" + ">"


def header(active: str, *, admin_active: bool = False) -> str:
    admin = (
        f'<span class="pill-admin pill-admin-active">Панель адм.</span>'
        if admin_active
        else '<a href="06-admin.html" class="pill-admin">Панель адм.</a>'
    )
    nav_items = [
        ("home", "Главная"),
        ("dashboard", "Дашборд"),
        ("profile", "Профиль"),
        ("help", "Справка"),
    ]
    pills = []
    for key, label in nav_items:
        cls = "pill pill-active" if active == key else "pill"
        pills.append(f'<span class="{cls}">{label}</span>')
    return f"""      <header class="header-bar">
        {D} class="header-left">
          <span class="logo">DiplomApp</span>
          {admin}
        {CD}
        <nav class="nav-pills">
          {"".join(pills)}
        </nav>
        {D} class="row">
          <span class="pill">Логин</span>
          <span class="pill">{"admin" if admin_active else "Роль"}</span>
          <span class="pill">Выйти</span>
        {CD}
      </header>"""


def shell(title: str, route: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <link rel="stylesheet" href="prototype.css" />
  </head>
  <body>
    <p class="page-title">Прототип: {route}</p>
    {D} class="nav-back"><a href="index.html">← Оглавление</a>{CD}
    {D} class="frame">
{body}
    {CD}
  </body>
</html>
"""


HOME = f"""
{header("home")}
      {D} class="ticker-strip">
        {D} class="label" style="border: none; margin: 0">Бегущая строка котировок{CD}
      {CD}

      {D} class="block">
        {D} class="label">Заголовок «Лента новостей»{CD}
        {D} class="rect" style="width: 55%">{CD}
      {CD}

      {D} class="block">
        {D} class="label">Фильтры (sticky): компания · категория · даты С / По · избранное{CD}
        {D} class="row">
          {D} class="block" style="flex:1;margin:0;min-width:100px">
            {D} class="rect rect-sm">{CD}
            {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">Компания{CD}
          {CD}
          {D} class="block" style="flex:1;margin:0;min-width:100px">
            {D} class="rect rect-sm">{CD}
            {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">Категория{CD}
          {CD}
          {D} class="block" style="flex:0;margin:0;min-width:72px">
            {D} class="rect rect-sm">{CD}
            {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">С{CD}
          {CD}
          {D} class="block" style="flex:0;margin:0;min-width:72px">
            {D} class="rect rect-sm">{CD}
            {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">По{CD}
          {CD}
          <span class="pill pill-outline">☆ Только избранное</span>
        {CD}
      {CD}

      {D} class="row" style="align-items: stretch">
        {D} class="col" style="flex: 1; min-width: 280px">
          {D} class="article-card article-good">
            {D} class="row" style="margin-bottom: 8px">
              {D} class="block" style="width:40px;height:40px;margin:0;padding:0">{CD}
              {D} style="flex:1">
                {D} class="rect rect-sm" style="width:55%">{CD}
                {D} class="rect rect-sm" style="width:35%">{CD}
              {CD}
            {CD}
            <span class="tag">категория-1</span><span class="tag">категория-2</span>
            {D} class="label" style="margin-top:8px">Карточка: текст новости + панель прогноза{CD}
            {D} class="rect">{CD}
            {D} class="grid-2" style="margin-top:8px">
              {D} class="block" style="margin:0">Цена до события / виджет{CD}
              {D} class="block" style="margin:0">Ссылка TradingView{CD}
            {CD}
            {D} class="block block-muted" style="margin-top:8px;margin-bottom:0">Форма нового прогноза{CD}
          {CD}

          {D} class="article-card">
            <span class="tag">рынок</span>
            {D} class="rect rect-sm" style="width:40%;margin-top:6px">{CD}
            {D} class="rect">{CD}
          {CD}
        {CD}

        <aside class="sidebar">
          {D} class="block">
            {D} class="label">Винрейт (donut + цифры){CD}
            {D} class="donut">62%{CD}
            {D} class="rect rect-sm" style="margin-top:8px">{CD}
            {D} class="rect rect-sm">{CD}
          {CD}
        </aside>
      {CD}

      {D} class="row" style="margin-top:8px;justify-content:center">
        <span class="pill">← Предыдущая</span>
        <span class="pill">Стр. N из M</span>
        <span class="pill">Вперёд →</span>
      {CD}
"""

DASH = f"""
{header("dashboard")}
      {D} class="block">
        {D} class="label">Заголовок «Дашборд»{CD}
      {CD}

      {D} class="block">
        {D} class="label">Панель: интервал · даты · (админ) пользователь · Excel / PDF{CD}
        {D} class="row" style="align-items:center">
          <span class="pill">7д</span><span class="pill pill-active">30д</span><span class="pill">90д</span>
          {D} class="rect" style="width:100px;height:28px;margin:0">{CD}
          {D} class="rect" style="width:100px;height:28px;margin:0">{CD}
          <span class="pill">Обновить</span>
          {D} class="block" style="margin:0;flex:1;min-width:160px">
            {D} class="rect rect-sm" style="width:100%">{CD}
            {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">Пользователь (только админ){CD}
          {CD}
          <span class="pill">Excel</span><span class="pill">PDF</span>
        {CD}
      {CD}

      {D} class="dashboard-layout">
        {D} class="col">
          {D} class="block">
            {D} class="label">Win / Lose (donut){CD}
            {D} class="donut" style="width:80px;height:80px;font-size:10px">W/L{CD}
          {CD}
          {D} class="block">
            {D} class="label">Чаще по категориям{CD}
            {D} class="chart-box" style="min-height:72px">
              {D} class="bar" style="height:70%">{CD}
              {D} class="bar" style="height:45%">{CD}
              {D} class="bar" style="height:55%">{CD}
            {CD}
          {CD}
          {D} class="grid-2">
            {D} class="block" style="margin:0">
              {D} class="label">Настроение{CD}
              {D} class="rect rect-sm">{CD}
            {CD}
            {D} class="block" style="margin:0">
              {D} class="label">Результативность{CD}
              {D} class="rect rect-sm">{CD}
            {CD}
          {CD}
        {CD}

        {D} class="col">
          {D} class="block">
            {D} class="label">Визуальная сводка{CD}
            {D} class="grid-2">
              {D} class="rect rect-sm">{CD}
              {D} class="rect rect-sm">{CD}
              {D} class="rect rect-sm">{CD}
              {D} class="rect rect-sm">{CD}
            {CD}
          {CD}
          {D} class="block">
            {D} class="label">Новости и прогнозы по компаниям (столбцы){CD}
            {D} class="grid-2">
              {D} class="chart-box" style="min-height:100px">
                {D} class="bar" style="height:40%">{CD}
                {D} class="bar" style="height:65%">{CD}
                {D} class="bar" style="height:30%">{CD}
              {CD}
              {D} class="chart-box" style="min-height:100px">
                {D} class="bar" style="height:50%">{CD}
                {D} class="bar" style="height:35%">{CD}
                {D} class="bar" style="height:60%">{CD}
              {CD}
            {CD}
          {CD}
          {D} class="block block-muted">
            {D} class="label">Активность пользователей (только админ) · N дней{CD}
            {D} class="row" style="margin-bottom:6px">
              <span class="pill pill-active">7</span><span class="pill">14</span><span class="pill">30</span>
            {CD}
            {D} class="chart-box chart-combo" style="min-height:120px">
              {D} class="combo-inner">
                {D} class="bar" style="height:35%">{CD}
                {D} class="bar" style="height:55%">{CD}
                {D} class="bar" style="height:40%">{CD}
                {D} class="bar" style="height:70%">{CD}
                {D} class="bar" style="height:45%">{CD}
              {CD}
              {D} class="label" style="border:none;font-size:9px;margin:4px 0 0">столбцы + линия активности{CD}
            {CD}
          {CD}
        {CD}
      {CD}
"""

PROFILE = f"""
{header("profile")}
      {D} class="block">
        {D} class="label">Заголовок «Профиль»{CD}
      {CD}

      {D} class="grid-2">
        {D} class="block">
          {D} class="label">Telegram: @бот, сохранение{CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect" style="width:50%;margin-top:8px">{CD}
        {CD}
        {D} class="block">
          {D} class="label">Уведомления: цены, интервал новостей{CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect" style="width:40%;margin-top:4px">{CD}
        {CD}
      {CD}

      {D} class="block">
        {D} class="label">Смена логина{CD}
        {D} class="rect rect-sm" style="width:60%">{CD}
        {D} class="rect" style="width:100px;margin-top:6px">{CD}
      {CD}

      {D} class="block">
        {D} class="label">Смена пароля{CD}
        {D} class="rect rect-sm">{CD}
        {D} class="rect rect-sm">{CD}
        {D} class="rect" style="width:100px;margin-top:6px">{CD}
      {CD}

      {D} class="block block-muted">
        {D} class="label">Удаление аккаунта (подтверждение паролем){CD}
        {D} class="rect rect-sm" style="width:50%">{CD}
        {D} class="rect" style="width:120px;margin-top:8px;background:#000">{CD}
      {CD}
"""

HELP = f"""
{header("help")}
      {D} class="block">
        {D} class="label">«Справочная система» — вступление{CD}
        {D} class="rect rect-sm" style="width:85%">{CD}
      {CD}

      {D} class="grid-2">
        {D} class="block">
          {D} class="label">1) Вход и регистрация{CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect rect-sm">{CD}
        {CD}
        {D} class="block">
          {D} class="label">2) Главная — фильтры С/По, категории на карточках{CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect rect-sm">{CD}
        {CD}
        {D} class="block">
          {D} class="label">3) Прогнозы и избранное{CD}
          {D} class="rect rect-sm">{CD}
        {CD}
        {D} class="block">
          {D} class="label">4) Дашборд — экспорт, категории, активность (админ){CD}
          {D} class="rect rect-sm">{CD}
          {D} class="rect rect-sm">{CD}
        {CD}
        {D} class="block">
          {D} class="label">4.1) Метрики дашборда{CD}
          {D} class="rect rect-sm">Win/Lose, винрейт, настроение, результативность{CD}
          {D} class="rect rect-sm">Чаще по категориям, сводка по компаниям{CD}
        {CD}
        {D} class="block">
          {D} class="label">5) Профиль и Telegram{CD}
          {D} class="rect rect-sm">{CD}
        {CD}
        {D} class="block">
          {D} class="label">6) Администратор — отдельная /admin{CD}
          {D} class="rect rect-sm">Панель: пользователи, роли, блокировка, удаление{CD}
          {D} class="rect rect-sm">Ссылка в шапке «Панель адм.»{CD}
        {CD}
      {CD}

      {D} class="hint-cyan">
        <strong>Подсказка</strong> — краткая справка по текущему разделу (как в приложении).
      {CD}
"""

ADMIN = f"""
{header("", admin_active=True)}
      {D} class="block">
        {D} class="label">Панель администратора{CD}
        {D} class="rect rect-sm" style="width:70%">{CD}
      {CD}

      {D} class="block">
        {D} class="label">Фильтры: дата регистрации с / по · обновить · сброс{CD}
        {D} class="row">
          {D} class="rect" style="width:110px;height:28px;margin:0">{CD}
          {D} class="rect" style="width:110px;height:28px;margin:0">{CD}
          <span class="pill">Обновить</span>
          <span class="pill pill-outline">Сбросить даты</span>
        {CD}
      {CD}

      {D} class="table-wrap">
        <table class="proto-table">
          <thead>
            <tr>
              <th>ID</th><th>Логин</th><th>Регистрация</th><th>Роль</th>
              <th>Доступ</th><th>Блокировка</th><th>Удаление</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>user_demo</td><td>01.01.2026</td><td>user</td><td>□</td><td>□</td><td>кнопка</td></tr>
            <tr><td>2</td><td>admin</td><td>15.12.2025</td><td>admin</td><td>□</td><td>□</td><td>кнопка</td></tr>
            <tr><td>3</td><td>blocked_user</td><td>20.03.2026</td><td>user</td><td>□</td><td>☑</td><td>кнопка</td></tr>
          </tbody>
        </table>
      {CD}
"""


def sanitize(text: str) -> str:
    return text.replace("</motion.div>", CD).replace("<motion.div", D)


def write_file(name: str, title: str, route: str, body: str) -> None:
    html = sanitize(shell(title, route, body))
    (CHB / name).write_text(html, encoding="utf-8")
    print("wrote", name)


if __name__ == "__main__":
    write_file("02-home.html", "CHB 02 — Лента новостей", "/home", HOME)
    write_file("03-dashboard.html", "CHB 03 — Дашборд", "/dashboard", DASH)
    write_file("04-profile.html", "CHB 04 — Профиль", "/profile", PROFILE)
    write_file("05-help.html", "CHB 05 — Справка", "/help", HELP)
    write_file("06-admin.html", "CHB 06 — Админ", "/admin", ADMIN)
    for p in CHB.glob("*.html"):
        t = p.read_text(encoding="utf-8")
        fixed = sanitize(t)
        if fixed != t:
            p.write_text(fixed, encoding="utf-8")
            print("sanitized", p.name)
