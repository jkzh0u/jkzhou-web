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

    // The layout depends on the screen, so the server can't render it. Send the video list
    // as text instead, so crawlers that don't run JS still see what's on the page.
    if (narrow === null) {
        return (
            <div style={{ minHeight: '100svh' }}>
                <ul className="sr-only">
                    {videos.map((video) => (
                        <li key={video.src}>
                            <a href={`/videos/${video.slug}`}>{video.title}</a>: {video.desc}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    return narrow ? <VideoListMobile videos={videos} /> : <VideoReel videos={videos} />;
}
