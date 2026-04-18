import raw from "@/data/market_lexicon.json";

export type MarketLexicon = {
  version: number;
  target_size: number;
  positive: string[];
  negative: string[];
  positive_phrases?: string[];
  negative_phrases?: string[];
  meta: {
    sources: string[];
    positive_count: number;
    negative_count: number;
    positive_phrase_count?: number;
    negative_phrase_count?: number;
  };
};

const doc = raw as MarketLexicon;

/** ~1000 позитивных токенов (SentiRusColl + доменные дополнения). */
export const MARKET_LEXICON_POSITIVE: readonly string[] = doc.positive;

/** ~1000 негативных токенов. */
export const MARKET_LEXICON_NEGATIVE: readonly string[] = doc.negative;

export const marketLexiconMeta = doc.meta;
