package com.suwalink.service;

import com.suwalink.dto.request.UpdatePharmacyProfileRequest;
import com.suwalink.dto.response.PharmacyProfileResponse;
import com.suwalink.dto.response.PharmacyPublicResponse;
import java.util.UUID;

public interface PharmacyProfileService {

    PharmacyProfileResponse getMyProfile();

    PharmacyProfileResponse updateMyProfile(UpdatePharmacyProfileRequest request);

    PharmacyPublicResponse getPublicPharmacy(UUID id);
}
