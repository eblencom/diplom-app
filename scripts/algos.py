#!/usr/bin/env python3
"""
Заглушка: в будущем здесь будет модель/логика предсказания по новости.
Сейчас всегда возвращает positive.
"""
from __future__ import annotations

import json
import sys


def predict(_news_id: int) -> str:
    return "positive"


def main() -> None:
    news_id = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    print(json.dumps({"prediction": predict(news_id)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
