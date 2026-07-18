package com.suwalink.IT3003.entity;

// VED Analysis: Based on Criticality (Health Impact)
public enum VedCategory {
    V, // Vital: Life-saving drugs (Must never be out of stock)
    E, // Essential: Important for health but not an immediate emergency
    D  // Desirable: Optional items, vitamins, or aesthetic products
}
