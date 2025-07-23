import Link from "next/link";
export default function Navbar() {
  return (
    <div className="grid grid-cols-2 gap-2 text-white pt-5 px-5">
      <div>
        <h3 className="font-bold xl:text-3xl lg:text-2xl md:text-xl text-md">
          We’re a creative-owned <br />
          agency that specialises in <br />
          Super x Solid outcomes.
        </h3>
      </div>
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Link href="/">Home</Link>
          <Link href="/">About</Link>
          <Link href="/">Whatever</Link>
        </div>
        <div>
          <Link href="/">Contact</Link>
        </div>
      </div>
    </div>
  );
}
