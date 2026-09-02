import type { Meta, StoryObj } from '@storybook/react';

import { DiscardNotice } from './discard-notice';

const meta = {
  title: 'Components/DiscardNotice',
  component: DiscardNotice,
  args: { onKeepEditing: () => {}, onDiscard: () => {} },
} satisfies Meta<typeof DiscardNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
