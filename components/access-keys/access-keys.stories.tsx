import type { Meta, StoryObj } from '@storybook/react';

import { AccessKeys } from './access-keys';

const meta = { title: 'Pages/AccessKeys', component: AccessKeys, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof AccessKeys>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
