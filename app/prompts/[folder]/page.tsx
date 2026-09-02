import { Prompts } from '../../../components/prompts';
import { WorkspaceSidebar } from '../../../components/workspace-sidebar';

type PromptFolderPageProps = {
  params: Promise<{ folder: string }>;
};

export default async function PromptFolderPage({ params }: PromptFolderPageProps) {
  const { folder } = await params;

  return (
    <main>
      <WorkspaceSidebar />
      <Prompts folderSlug={folder} />
    </main>
  );
}
