package com.suwalink.dto.response;
import com.suwalink.entity.District;
import java.math.BigDecimal;
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
    private String phone;
    private District district;
    private String city;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String openingHours;
    private boolean demo;
}
