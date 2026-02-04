/**
 * Test enum parsing with fixed underlying types
 */

// Mock vscode
global.vscode = {
    workspace: {
        getConfiguration: () => ({ get: (key, def) => def }),
        onDidChangeConfiguration: () => ({})
    }
};

const { StructAnalyzer } = require('../../src/structAnalyzer');

console.log('Running enum parsing tests...\n');

const analyzer = new StructAnalyzer();

// Test case from the bug report
const testCode = `
#include <cstdint>

enum MyEnum : uint8_t { A, B };

struct MyStruct {
    uint32_t x;
    MyEnum enumField;
    uint32_t y;
};

enum DefaultEnum { C, D };

struct DefaultEnumTest {
    char a;
    DefaultEnum e;
    char b;
};
`;

const structs = analyzer.parseStructs(testCode);

let failed = 0;

// Test 1: MyStruct with uint8_t enum
const myStruct = structs.find(s => s.name === 'MyStruct');
if (myStruct) {
    const enumField = myStruct.fields.find(f => f.name === 'enumField');
    if (enumField) {
        if (enumField.size === 1) {
            console.log('[PASS] MyEnum field size is 1 byte (uint8_t underlying)');
        } else {
            console.error(`[FAIL] MyEnum field size is ${enumField.size}, expected 1`);
            failed++;
        }
    } else {
        console.error('[FAIL] enumField not found in MyStruct');
        failed++;
    }
    
    // Check total struct size (should be 12 with 3 bytes padding)
    if (myStruct.totalSize === 12) {
        console.log('[PASS] MyStruct total size is 12 bytes');
    } else {
        console.error(`[FAIL] MyStruct total size is ${myStruct.totalSize}, expected 12`);
        failed++;
    }
    
    // Check padding
    if (myStruct.paddingBytes === 3) {
        console.log('[PASS] MyStruct has 3 bytes of padding');
    } else {
        console.error(`[FAIL] MyStruct has ${myStruct.paddingBytes} bytes padding, expected 3`);
        failed++;
    }
} else {
    console.error('[FAIL] MyStruct not found');
    failed++;
}

// Test 2: DefaultEnumTest with default int enum
const defaultTest = structs.find(s => s.name === 'DefaultEnumTest');
if (defaultTest) {
    const eField = defaultTest.fields.find(f => f.name === 'e');
    if (eField) {
        if (eField.size === 4) {
            console.log('[PASS] DefaultEnum field size is 4 bytes (int underlying)');
        } else {
            console.error(`[FAIL] DefaultEnum field size is ${eField.size}, expected 4`);
            failed++;
        }
    } else {
        console.error('[FAIL] e field not found in DefaultEnumTest');
        failed++;
    }
} else {
    console.error('[FAIL] DefaultEnumTest not found');
    failed++;
}

console.log('');
if (failed > 0) {
    console.log(`${failed} tests failed.`);
    process.exit(1);
} else {
    console.log('All enum tests passed!');
}
