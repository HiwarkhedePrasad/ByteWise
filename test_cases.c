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

// 10. Enum with fixed underlying type (uint8_t = 1 byte)
enum MyEnum : uint8_t { A, B };

struct EnumTest {
    uint32_t x;       // 4 bytes, offset 0
    MyEnum enumField; // 1 byte, offset 4, 3 bytes padding after
    uint32_t y;       // 4 bytes, offset 8
};  // Total: 12 bytes, 3 bytes padding

// 11. Default enum (should be int size = 4 bytes)
enum DefaultEnum { C, D };

struct DefaultEnumTest {
    char a;         // 1 byte, offset 0, 3 bytes padding
    DefaultEnum e;  // 4 bytes, offset 4
    char b;         // 1 byte, offset 8, 3 bytes padding
};  // Total: 12 bytes, 6 bytes padding
