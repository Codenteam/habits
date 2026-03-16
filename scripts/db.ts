import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Usage: node scripts/db.ts <db-path>
async function main() {
    const dbPath = process.argv[2];
    if (!dbPath) {
        console.error('Usage: node scripts/db.ts <db-path>');
        process.exit(1);
    }

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    // Get all table names
    const tables = await db.all(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `);

    if (tables.length === 0) {
        console.log('No tables found in database.');
        return;
    }

    console.log('\n=== Tables in Database ===');
    tables.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.name}`);
    });

    for (const { name } of tables) {
        console.log(`\n--- Table: ${name} ---`);
        const rows = await db.all(`SELECT * FROM "${name}" LIMIT 10`);
        if (rows.length === 0) {
            console.log('(empty)');
            continue;
        }
        // Pretty print rows
        rows.forEach((row, i) => {
            console.log(`Row ${i + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
                console.log(`  ${key}: ${JSON.stringify(value)}`);
            });
        });
    }

    await db.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});