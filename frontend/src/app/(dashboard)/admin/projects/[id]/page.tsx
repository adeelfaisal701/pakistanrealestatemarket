import { ProjectEditor } from '@/components/admin/ProjectEditor';

export default async function EditAdminProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectEditor projectId={id} />;
}
