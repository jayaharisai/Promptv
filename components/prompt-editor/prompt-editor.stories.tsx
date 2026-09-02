import type { Meta, StoryObj } from '@storybook/react';

import { PromptEditor } from './prompt-editor';

const meta = {
  title: 'Pages/PromptEditor',
  component: PromptEditor,
  parameters: { layout: 'fullscreen' },
  args: { folder: 'New folder', prompt: '', isCreating: true },
} satisfies Meta<typeof PromptEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
