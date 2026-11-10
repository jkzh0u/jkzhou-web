'use client';

import type { ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import RingFooter from './RingFooter';

// The ring only shows on the homepage
export default function RingFooterGate(props: ComponentProps<typeof RingFooter>) {
    const pathname = usePathname();

    if (pathname !== '/') return null;

    return <RingFooter {...props} />;
}
