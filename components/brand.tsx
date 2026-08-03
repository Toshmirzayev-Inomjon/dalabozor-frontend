import Link from "next/link";
import { Icon } from "./icons";

export function Brand({
  compact = false,
  href = "/",
  inverse = false,
}: {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-xl" aria-label="DalaBozor bosh sahifa">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-gold text-white shadow-[0_8px_20px_rgba(23,92,58,.2)]">
        <Icon name="leaf" className="h-5 w-5" />
      </span>
      {!compact && (
        <span className={`font-head text-[19px] font-extrabold tracking-[-0.035em] ${inverse ? "text-white" : "text-text"}`}>
          Dala<span className={inverse ? "text-accent" : "text-gold"}>Bozor</span>
        </span>
      )}
    </Link>
  );
}
