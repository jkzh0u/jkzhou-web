'use client';

import type { ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import RingFooter from './RingFooter';

const HIDDEN_ON = [/^\/contact\/?$/, /^\/videos\/?$/, /^\/photos\/[^/]+\/?$/];

export default function RingFooterGate(props: ComponentProps<typeof RingFooter>) {
    const pathname = usePathname();

    if (HIDDEN_ON.some((re) => re.test(pathname))) return null;

    return <RingFooter {...props} />;
}
