const assert = require('assert');
const { parseFields } = require('../../src/parsers/fieldParser');
const { getDefaultTypeSizes } = require('../../src/utils/typeUtils');

const typeSizes = getDefaultTypeSizes(8);
const targetAlignment = 8;

console.log('Running parser unit tests...');

const tests = [
    {
        name: 'Simple int',
        body: 'int x;',
        expected: [{ name: 'x', type: 'int', size: 4, offset: 0 }]
    },
    {
        name: 'Unsigned int (Multi-word type)',
        body: 'unsigned int y;',
        expected: [{ name: 'y', type: 'unsigned int', size: 4, offset: 0 }]
    },
    {
        name: 'Long long',
        body: 'long long z;',
        expected: [{ name: 'z', type: 'long long', size: 8, offset: 0 }]
    },
    {
        name: 'Pointer',
        body: 'int* ptr;',
        expected: [{ name: 'ptr', type: 'int*', size: 8, offset: 0 }]
    },
    {
        name: 'Array',
        body: 'char buf[10];',
        expected: [{ name: 'buf', type: 'char', size: 10, offset: 0, arraySize: 10 }]
    },
    {
        name: 'Struct with multiple fields',
        body: 'int a; char b; double c;',
        expected: [
            { name: 'a', type: 'int' },
            { name: 'b', type: 'char' },
            { name: 'c', type: 'double' }
        ]
    }
];

let failed = 0;

tests.forEach(test => {
    try {
        const fields = parseFields(test.body, targetAlignment, typeSizes);
        if (fields.length === 0) {
            throw new Error('No fields parsed');
        }
        
        // Check first field (or all if multiple)
        if (test.expected.length > 1) {
             if (fields.length !== test.expected.length) throw new Error(`Expected ${test.expected.length} fields, got ${fields.length}`);
             fields.forEach((f, i) => {
                 if (f.name !== test.expected[i].name) throw new Error(`Field ${i} name mismatch`);
                 if (f.type !== test.expected[i].type) throw new Error(`Field ${i} type mismatch`);
             });
        } else {
            const field = fields[0];
            if (field.type !== test.expected[0].type) {
                 throw new Error(`Type mismatch: expected '${test.expected[0].type}', got '${field.type}'`);
            }
            if (field.name !== test.expected[0].name) {
                 throw new Error(`Name mismatch: expected '${test.expected[0].name}', got '${field.name}'`);
            }
        }
        
        console.log(`[PASS] ${test.name}`);
    } catch (e) {
        console.error(`[FAIL] ${test.name}: ${e.message}`);
        failed++;
    }
});

if (failed > 0) {
    console.log(`\n${failed} tests failed.`);
    process.exit(1);
} else {
    console.log('\nAll tests passed!');
}
