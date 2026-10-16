import { JobFilesFolder } from "@/components/JobFilesFolder";

export const metadata = { title: "Shop Drawings" };

export default async function JobShopDrawingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobFilesFolder jobId={id} fileType="shop_drawing" />;
}
