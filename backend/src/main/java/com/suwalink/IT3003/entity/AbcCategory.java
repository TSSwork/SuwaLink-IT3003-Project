package com.suwalink.IT3003.entity;

// ABC Analysis: Based on Consumption Value (Price x Volume)
public enum AbcCategory {
    A, // 70-80% of total value (High cost, keep low stock, strict control)
    B, // 15-20% of total value (Moderate cost)
    C  // 5-10% of total value (Cheap, keep bulk stock, loose control)
}
