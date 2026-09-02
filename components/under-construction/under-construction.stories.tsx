import type { Meta, StoryObj } from '@storybook/react';

import { UnderConstruction } from './under-construction';

const meta = {
  title: 'Pages/UnderConstruction',
  component: UnderConstruction,
  parameters: { layout: 'fullscreen' },
  args: { title: 'Settings' },
} satisfies Meta<typeof UnderConstruction>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
