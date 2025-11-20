/**
 * Utility functions for memory layout calculations
 */

/**
 * Calculate memory layout for fields
 * @param {Array} fields - Array of field objects
 * @param {number} targetAlignment - Target platform alignment (or 1 if packed)
 * @returns {Object} Layout information
 */
function calculateLayout(fields, targetAlignment = 8) {
  let offset = 0;
  let totalPadding = 0;
  const layoutFields = [];
  
  // Track bitfield packing
  let currentBitfieldStorage = null;
  let currentBitOffset = 0;

  for (const field of fields) {
    // Handle recursive anonymous structs/unions
    if (field.isAnonymous && field.innerFields) {
        // If it's a union, size is max(fields), align is max(align).
        if (field.isUnion) {
             const unionLayout = calculateUnionLayout(field.innerFields, targetAlignment);
             field.size = unionLayout.totalSize;
             field.alignment = unionLayout.alignment;
        } else {
             const innerLayout = calculateLayout(field.innerFields, targetAlignment);
             field.size = innerLayout.totalSize;
             field.alignment = innerLayout.alignment;
        }
    }

    // Handle Bitfields
    if (field.isBitField) {
        // Reset storage if :0 bitfield
        if (field.bits === 0) {
            if (currentBitfieldStorage) {
                // Finish current storage
                offset += currentBitfieldStorage.size;
                currentBitfieldStorage = null;
                currentBitOffset = 0;
            }
            // :0 doesn't add a field, just resets
            continue;
        }

        // Determine storage unit size
        // Min implementation: int -> 4, long long -> 8
        let storageSize = 4;
        if (field.type.includes("long long")) storageSize = 8;
        else if (field.type.includes("short")) storageSize = 2;
        else if (field.type.includes("char")) storageSize = 1;
        
        // Check if we can pack into current storage
        if (currentBitfieldStorage && 
            currentBitfieldStorage.size === storageSize && 
            (currentBitOffset + field.bits) <= (storageSize * 8)) {
            
            // Fits in current unit
            field.offset = currentBitfieldStorage.offset;
            field.bitOffset = currentBitOffset;
            field.padding = 0;
            field.size = 0; // Consumed by storage
            currentBitOffset += field.bits;
            
            layoutFields.push(field);
            continue;
        } else {
            // Start new unit
            // Finish previous if exists
            if (currentBitfieldStorage) {
                offset += currentBitfieldStorage.size;
            }

            // Align to storage alignment
            const align = targetAlignment === 1 ? 1 : storageSize; // Use storage size as alignment
            const padding = (align - (offset % align)) % align;
            offset += padding;
            totalPadding += padding;
            
            field.offset = offset;
            field.padding = padding;
            field.bitOffset = 0;
            field.size = 0; // Will be accounted for when we advance offset
            
            currentBitfieldStorage = {
                type: field.type,
                offset: offset,
                size: storageSize
            };
            
            currentBitOffset = field.bits;
            layoutFields.push(field);
        }
    } else {
        // Finish any pending bitfield storage
        if (currentBitfieldStorage) {
            offset += currentBitfieldStorage.size;
            currentBitfieldStorage = null;
            currentBitOffset = 0;
        }
        
        // Handle Flexible Array Member
        if (field.isFlexibleArray) {
            field.offset = offset;
            field.size = 0;
            field.padding = 0;
            layoutFields.push(field);
            // Do NOT align or advance offset
            continue;
        }

        // Regular field alignment
        const align = targetAlignment === 1 ? 1 : field.alignment;
        const padding = (align - (offset % align)) % align;
        offset += padding;
        totalPadding += padding;

        layoutFields.push({
          ...field,
          offset,
          padding,
        });

        offset += field.size;
    }
  }
  
  // Finish any pending bitfield storage at end of struct
  if (currentBitfieldStorage) {
      offset += currentBitfieldStorage.size;
  }

  // Final padding to align struct size to largest alignment
  // If packed, alignment is 1, so no padding.
  const largestAlignment = targetAlignment === 1 ? 1 : Math.max(...fields.map((f) => f.alignment || 1), 1);
  
  const finalPadding =
    (largestAlignment - (offset % largestAlignment)) % largestAlignment;
  offset += finalPadding;
  totalPadding += finalPadding;

  return {
    fields: layoutFields,
    totalSize: offset,
    paddingBytes: totalPadding,
    alignment: largestAlignment,
  };
}

function calculateUnionLayout(fields, targetAlignment) {
    // Union size is max(size), align is max(align)
    let maxSize = 0;
    let maxAlign = 1;
    
    const layoutFields = fields.map(f => {
        // Recursively size if needed
        if (f.isAnonymous && f.innerFields) {
             if (f.isUnion) {
                 const inner = calculateUnionLayout(f.innerFields, targetAlignment);
                 f.size = inner.totalSize;
                 f.alignment = inner.alignment;
             } else {
                 const inner = calculateLayout(f.innerFields, targetAlignment);
                 f.size = inner.totalSize;
                 f.alignment = inner.alignment;
             }
        }
        
        if (f.size > maxSize) maxSize = f.size;
        if (f.alignment > maxAlign) maxAlign = f.alignment;
        
        return { ...f, offset: 0, padding: 0 };
    });
    
    // Align total size to maxAlign
    const finalAlign = targetAlignment === 1 ? 1 : maxAlign;
    const padding = (finalAlign - (maxSize % finalAlign)) % finalAlign;
    const totalSize = maxSize + padding;
    
    return {
        fields: layoutFields,
        totalSize,
        paddingBytes: padding, // Not really padding in the same sense
        alignment: finalAlign
    };
}

/**
 * Optimize struct layout by reordering fields
 * @param {Array} fields - Original fields
 * @param {number} targetAlignment - Target platform alignment
 * @returns {Object} Optimization information
 */
function optimizeLayout(fields, targetAlignment = 8) {
  // Filter out fields that shouldn't be reordered
  // 1. Bitfields (complex to reorder safely)
  // 2. Anonymous structs/unions (can't easily break them apart)
  // 3. Flexible arrays (must be at end)
  
  const hasBitfields = fields.some(f => f.isBitField);
  const hasAnonymous = fields.some(f => f.isAnonymous);
  const hasFlexibleArray = fields.some(f => f.isFlexibleArray);
  
  // If packed (alignment 1), optimization (reordering) usually doesn't save space 
  // and might break intended packing.
  if (targetAlignment === 1) {
      return {
          optimizedFields: fields,
          optimizedSize: calculateLayout(fields, 1).totalSize,
          memorySaved: 0,
          optimizationRatio: 0,
          message: "Packed struct (not optimized)"
      };
  }
  
  if (hasBitfields || hasAnonymous || hasFlexibleArray) {
      return {
          optimizedFields: fields,
          optimizedSize: calculateLayout(fields, targetAlignment).totalSize,
          memorySaved: 0,
          optimizationRatio: 0,
          message: "Contains complex types (not optimized)"
      };
  }

  // Sort fields by alignment (descending) then by size (descending)
  const sortedFields = [...fields].sort((a, b) => {
    if (a.alignment !== b.alignment) {
      return b.alignment - a.alignment;
    }
    return b.size - a.size;
  });

  const optimizedLayout = calculateLayout(sortedFields, targetAlignment);
  const originalSize = calculateLayout(fields, targetAlignment).totalSize;
  
  // Fix: Only report if we actually saved bytes
  const memorySaved = originalSize - optimizedLayout.totalSize;

  if (memorySaved <= 0) {
       return {
        optimizedFields: fields,
        optimizedSize: originalSize,
        memorySaved: 0,
        optimizationRatio: 0,
      };
  }

  return {
    optimizedFields: optimizedLayout.fields,
    optimizedSize: optimizedLayout.totalSize,
    memorySaved: memorySaved,
    optimizationRatio:
      originalSize > 0 ? (memorySaved / originalSize) * 100 : 0,
  };
}

// Helper to get type size for bitfield logic (simplified)
function getTypeSize(type) {
    if (type.includes("int")) return 4;
    if (type.includes("short")) return 2;
    if (type.includes("char")) return 1;
    if (type.includes("long long")) return 8;
    return 4;
}

module.exports = {
  calculateLayout,
  optimizeLayout,
  calculateUnionLayout,
};
