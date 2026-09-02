import { AccessKeys } from '../../../components/access-keys';
import { WorkspaceSidebar } from '../../../components/workspace-sidebar';

type AccessKeyDetailsPageProps = {
  params: Promise<{ keyId: string }>;
};

export default async function AccessKeyDetailsPage({ params }: AccessKeyDetailsPageProps) {
  const { keyId } = await params;

  return <main><WorkspaceSidebar /><AccessKeys initialKeyId={keyId} /></main>;
}
