
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

async function debugData() {
    try {
        console.log('Fetching data...');
        const response = await fetch('http://localhost:3000/api/data');
        const data = await response.json();
        console.log(`Total records: ${data.length}`);

        // Find records with Qty A > 0
        const qtyARecords = data.filter(r => r.qtya > 0);
        console.log(`Records with Qty A > 0: ${qtyARecords.length}`);

        if (qtyARecords.length === 0) {
            console.log('NO RECORDS WITH QTY A FOUND! Check API query.');
            return;
        }

        // Pick a sample Job ID from a Qty A record
        const sample = qtyARecords[0];
        const sampleJob = sample.m_job;
        const sampleDate = sample.m_date;
        const sampleKiln = sample.m_kiln;

        console.log('\n--- Sample Analysis ---');
        console.log(`Focusing on Job: ${sampleJob}, Date: ${sampleDate}, Kiln: ${sampleKiln}`);

        // Find ALL records for this context
        const relatedRecords = data.filter(r =>
            r.m_job === sampleJob &&
            r.m_kiln === sampleKiln
        );

        console.log(`Total related records found: ${relatedRecords.length}`);

        console.log('\nField Comparison:');
        relatedRecords.forEach(r => {
            console.log(`Type: ${r.sub_typ?.padEnd(10)} | Doc: ${r.m_doc} | CP: ${r.m_cp} | QtyA: ${r.qtya} | Scrap: ${r.qtyscrp}`);
        });

        // Test current grouping key
        console.log('\n--- Testing Current Grouping Key (Date_Kiln_Doc_CP) ---');
        const currentKeyMap = {};
        relatedRecords.forEach(r => {
            const key = `${r.m_date}_${r.m_kiln}_${r.m_doc}_${r.m_cp}`;
            if (!currentKeyMap[key]) currentKeyMap[key] = { qtyA: 0, items: 0 };
            currentKeyMap[key].qtyA += (r.qtya || 0);
            currentKeyMap[key].items++;
        });
        console.table(currentKeyMap);

        // Test broader grouping key (Date_Kiln_Job)
        console.log('\n--- Testing Broader Grouping Key (Date_Kiln_Job) ---');
        const broaderKeyMap = {};
        relatedRecords.forEach(r => {
            const key = `${r.m_date}_${r.m_kiln}_${r.m_job}`;
            if (!broaderKeyMap[key]) broaderKeyMap[key] = { qtyA: 0, items: 0 };
            broaderKeyMap[key].qtyA += (r.qtya || 0);
            broaderKeyMap[key].items++;
        });
        console.table(broaderKeyMap);

    } catch (error) {
        console.error('Error:', error);
    }
}

debugData();
