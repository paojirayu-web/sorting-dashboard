import { NextResponse, type NextRequest } from 'next/server';
import { isMixPublicHost, isMixPublicPathAllowed } from '@/lib/mix-public';

function requestHost(req: NextRequest): string {
    return req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
}

export function proxy(req: NextRequest) {
    if (!isMixPublicHost(requestHost(req))) return NextResponse.next();

    const { pathname } = req.nextUrl;
    if (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
        const url = req.nextUrl.clone();
        url.pathname = '/mix';
        url.search = '';
        return NextResponse.redirect(url);
    }

    if (!isMixPublicPathAllowed(pathname)) {
        return new NextResponse('Not found', { status: 404 });
    }

    if (process.env.MIX_PUBLIC_REQUIRE_ACCESS === 'true') {
        const assertion = req.headers.get('cf-access-jwt-assertion');
        if (!assertion) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
