#include <stddef.h>

// 1. Flexible Array Member
struct Flex {
    size_t len;
    char data[]; // Should be size 0
};

// 2. Packed Struct with Pragma
#pragma pack(push, 1)
struct PackedP {
    char a;
    int b;
    char c;
};
#pragma pack(pop)

// 3. Anonymous Struct & Union
struct WithAnon {
    struct { int a; char b; } anon;
    union { int u1; double u2; };
    char tail;
};

// 4. Bitfields
struct BitFields {
    int a : 3;
    int b : 5;
    int c : 24; // Total 32 bits = 4 bytes
    int : 0;    // Reset
    unsigned long long d : 1; // New storage unit (8 bytes)
};

// 5. Inline Struct
struct InlineDecl { 
    struct Embedded { int e; char f; } emb;
} inline_inst;

// 6. Packed Attribute
struct PackedAttr {
    char a;
    int b;
    char c;
} __attribute__((packed));

// 7. Union
union U {
    struct { char a; int b; } s;
    double d;
};

// 8. Aligned Attribute
struct AlignTest {
    char a;
    int b __attribute__((aligned(16)));
    char c;
} __attribute__((aligned(8)));

// 9. Multi-dimensional Array
struct ArrayTest {
    int matrix[3][2];
};
