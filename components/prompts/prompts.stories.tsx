import type { Meta, StoryObj } from '@storybook/react';

import { Prompts } from './prompts';

const meta = {
  title: 'Pages/Prompts',
  component: Prompts,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Prompts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
