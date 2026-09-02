import type { Meta, StoryObj } from '@storybook/react';

import { WorkspaceSidebar } from './workspace-sidebar';

const meta = {
  title: 'Components/WorkspaceSidebar',
  component: WorkspaceSidebar,
} satisfies Meta<typeof WorkspaceSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
