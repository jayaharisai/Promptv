import type { Meta, StoryObj } from '@storybook/react';

import { ThemeSettings } from './theme-settings';

const meta = {
  title: 'Pages/ThemeSettings',
  component: ThemeSettings,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ThemeSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
