import { PromptEditor } from '../../../../components/prompt-editor';
import { WorkspaceSidebar } from '../../../../components/workspace-sidebar';

type PromptEditorPageProps = {
  params: Promise<{ folder: string; prompt: string }>;
};

export default async function PromptEditorPage({ params }: PromptEditorPageProps) {
  const { folder, prompt } = await params;
  const isCreating = prompt === 'new';

  return (
    <main>
      <WorkspaceSidebar />
      <PromptEditor folder={folder} prompt={isCreating ? '' : prompt} isCreating={isCreating} />
    </main>
  );
}
