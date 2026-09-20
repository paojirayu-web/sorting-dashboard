import { Suspense } from 'react';
import { ReasonsPage } from '@/components/dashboard/ReasonsPage';

export const metadata = {
    title: 'Defects Overview · QC root-cause',
    robots: { index: false, follow: false },
};

export default function ReasonsRoute() {
    return (
        <Suspense fallback={null}>
            <ReasonsPage />
        </Suspense>
    );
}
