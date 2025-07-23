import Link from "next/link";

interface LinkProps {
  href: string;
  title: string;
}
export default function LinkRotation({ title, href }: LinkProps) {
  return (
    <Link
      href={href}
      className="relative inline-block group h-[20px] overflow-hidden font-semibold"
    >
      <span className="block transition-transform duration-400 group-hover:-translate-y-full group-hover:-rotate-x-90">
        {title}
      </span>
      <span className="absolute inset-0 block translate-y-full rotate-x-90 transition-transform duration-300 group-hover:translate-y-0 group-hover:rotate-x-0">
        {title}
      </span>
    </Link>
  );
}
