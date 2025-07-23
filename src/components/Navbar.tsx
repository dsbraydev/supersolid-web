import LinkRotation from "./LinkRotation";
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
        <div className="flex gap-4">
          <LinkRotation title="Work" href="/" />
          <LinkRotation title="About" href="/" />
          <LinkRotation title="Whatever" href="/" />
        </div>
        <div>
          <LinkRotation title="Contact" href="/" />
        </div>
      </div>
    </div>
  );
}
