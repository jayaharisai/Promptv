import type { Meta, StoryObj } from '@storybook/react';

import { AuditLogs } from './audit-logs';

const meta = {
  title: 'Pages/AuditLogs',
  component: AuditLogs,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AuditLogs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
