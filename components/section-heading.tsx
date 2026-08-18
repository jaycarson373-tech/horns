import Link from "next/link";

export function SectionHeading({ eyebrow, title, description, href, linkLabel }: { eyebrow: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return <header className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{href && linkLabel ? <Link href={href}>{linkLabel} →</Link> : null}</header>;
}
