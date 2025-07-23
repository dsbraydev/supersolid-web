import LinkRotation from "./LinkRotation";
import LinkIconRotation from "./LinkIconRotation";
export default function Navbar() {
  return (
    <div className="grid grid-cols-2 gap-2 text-white pt-5 px-5 fixed z-10 w-full max-w-[100vw]">
      <div />
      <div className="flex justify-between">
        <div className="flex gap-4">
          <LinkRotation title="Work" href="/" />
          <LinkRotation title="About" href="/" />
          <LinkRotation title="Whatever" href="/" />
        </div>
        <div>
          <LinkIconRotation title="Contact" href="/" />
        </div>
      </div>
    </div>
  );
}
