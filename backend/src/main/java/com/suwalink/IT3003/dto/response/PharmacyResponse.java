package com.suwalink.IT3003.dto.response;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class PharmacyResponse {
    private String id;
    private String pharmacyName;
    private String email;
    private String licenceNo;
    private String address;
    private String status;
}
