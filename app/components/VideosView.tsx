'use client';

import { useSyncExternalStore } from 'react';
import VideoReel, { type ReelVideo } from './VideoReel';
import VideoListMobile from './VideoListMobile';

const QUERY = '(max-width: 999px)';

const subscribe = (cb: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
};
const getNarrow = () => window.matchMedia(QUERY).matches;
const getNarrowOnServer = () => null;

export default function VideosView({ videos }: { videos: ReelVideo[] }) {
    const narrow = useSyncExternalStore(subscribe, getNarrow, getNarrowOnServer);

    if (narrow === null) return <div style={{ minHeight: '100svh' }} />;
    return narrow ? <VideoListMobile videos={videos} /> : <VideoReel videos={videos} />;
}
