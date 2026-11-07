'use client';

import type { ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import RingFooter from './RingFooter';

const HIDDEN_ON = ['/contact'];

export default function RingFooterGate(props: ComponentProps<typeof RingFooter>) {
    const pathname = usePathname();

    if (HIDDEN_ON.includes(pathname)) return null;

    return <RingFooter {...props} />;
}
