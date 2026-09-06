import { MixPage } from '@/components/dashboard/MixPage';

export const metadata = {
    title: 'Production Mix',
    robots: { index: false, follow: false },
};

export default function MixRoute() {
    return <MixPage />;
}
