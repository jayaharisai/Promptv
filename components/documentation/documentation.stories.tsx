import type { Meta, StoryObj } from '@storybook/react';

import { Documentation } from './documentation';

const meta = {
  title: 'Pages/Documentation',
  component: Documentation,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Documentation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
