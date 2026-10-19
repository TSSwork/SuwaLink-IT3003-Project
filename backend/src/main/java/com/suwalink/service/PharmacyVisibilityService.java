package com.suwalink.service;

import com.suwalink.entity.Pharmacy;

public interface PharmacyVisibilityService {

    boolean isDemoModePublic();

    void setDemoModePublic(boolean value);

    /** Alias of {@link #isDemoModePublic()}, used by queries deciding whether demo rows are included. */
    boolean includeDemo();

    /** A pharmacy is publicly visible when VERIFIED and (not a demo, or demo mode is on). */
    boolean isPubliclyVisible(Pharmacy pharmacy);
}
