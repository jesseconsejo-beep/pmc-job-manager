import { JobFilesFolder } from "@/components/JobFilesFolder";

export const metadata = { title: "IFCs" };

export default async function JobIfcsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobFilesFolder jobId={id} fileType="ifc" />;
}
