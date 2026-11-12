import { playAccountId } from "@/lib/play/access";
import { PixelPoseGallery } from "@/components/play/pixel-pose-gallery";
export default async function SpritePage() {
  await playAccountId();
  return <PixelPoseGallery />;
}
