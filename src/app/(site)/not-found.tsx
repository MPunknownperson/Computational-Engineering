import Link from "next/link";
import { Owl } from "@/components/Mascots";
import { Icon } from "@/components/Icons";

export const metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 text-center">
      <div className="sketch inline-block px-8 py-10 sm:px-14">
        <Owl mood="worry" size={124} />
        <p className="mono mt-4 text-xs font-extrabold uppercase tracking-[.2em] text-slate-500">
          Error 404
        </p>
        <h1 className="h-title mt-2 text-4xl">
          This page <span className="h-underline">doesn&apos;t add up</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600">
          Nova checked twice — there is nothing at this address. The link may be old, or the
          tool may have moved into the directory.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Back home
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link href="/calculators" className="btn">
            Browse tools
          </Link>
        </div>
      </div>
    </div>
  );
}
