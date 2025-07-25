import icons from "./images"; // path to your icons file
import SmoothIconSlot from "./SmoothIconSlot";
import TVShimmerBackground from "./TVShimmerBackground";
export default function Loader() {
  if (!icons || icons.length === 0) {
    return <div>No icons found</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-4">
      <TVShimmerBackground />
      <SmoothIconSlot />
    </div>
  );
}
