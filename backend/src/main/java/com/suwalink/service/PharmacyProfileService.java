package com.suwalink.service;

import com.suwalink.dto.request.UpdatePharmacyProfileRequest;
import com.suwalink.dto.response.PharmacyProfileResponse;

public interface PharmacyProfileService {

    PharmacyProfileResponse getMyProfile();

    PharmacyProfileResponse updateMyProfile(UpdatePharmacyProfileRequest request);
}
