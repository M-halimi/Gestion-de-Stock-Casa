import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function usePageLoading() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const start = () => setLoading(true);
        const finish = () => setLoading(false);
        const offStart = router.on('start', start);
        const offFinish = router.on('finish', finish);
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    return loading;
}