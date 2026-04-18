/** Минут после минуты публикации новости (MSK, floor) — свеча MOEX 1m для второй цены. */
export const PRICE_AFTER_LAG_MINUTES = 60;

/** Клиентский опрос GET /predict пока статус expect; запас после лага на синк и закрытие. */
export const PREDICT_POLL_MAX_WAIT_MS =
  (PRICE_AFTER_LAG_MINUTES + 30) * 60 * 1000;
