const fetch = require('node-fetch');

async function test() {
    try {
        console.log('Testing /api/products...');
        const resProducts = await fetch('http://localhost:3000/api/products');
        const products = await resProducts.json();
        console.log('Products found:', products.length);

        if (products.length > 0) {
            const first = products[0];
            console.log(`Testing /api/product-stats for: ${first}`);
            const resStats = await fetch(`http://localhost:3000/api/product-stats?product=${encodeURIComponent(first)}`);
            const stats = await resStats.json();
            console.log('Stats received keys:', Object.keys(stats));
            if (stats.overall) {
                console.log('Overall metrics:', stats.overall.metrics);
                console.log('Overall breakdown (C) count:', stats.overall.breakdown.C.length);
            }
            if (stats.cpBreakdown) {
                console.log('CP Breakdown count:', stats.cpBreakdown.length);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
