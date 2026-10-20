package com.suwalink.dto.response;

import com.suwalink.entity.District;
import com.suwalink.entity.PharmacyStatus;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyProfileResponse {
    private UUID id;
    private String name;
    private String phone;
    private String address;
    private District district;
    private String city;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String openingHours;
    private String licenceNo;
    private PharmacyStatus status;
    private String ownerName;
    private String ownerEmail;
}
