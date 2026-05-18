import Image from "next/image";

type Props = {
  ticker: string;
  name?: string;
  size?: number;
  className?: string;
};

const LOGO_VERSION = "3";

export function CompanyLogo({ ticker, name, size = 24, className = "" }: Props) {
  const safeTicker = ticker.trim().toUpperCase();
  if (!safeTicker) {
    return null;
  }

  return (
    <Image
      src={`/api/company-logo/${encodeURIComponent(safeTicker)}?v=${LOGO_VERSION}`}
      alt={name ? `Логотип ${name}` : ""}
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 rounded-full bg-white object-contain p-0.5 ${className}`}
    />
  );
}
