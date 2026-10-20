package com.suwalink.support;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

public final class TestPayloads {

    private TestPayloads() {
    }

    public static String pharmacyRegistration(String email, String licenceNo) {
        return """
            {
              "name": "Test Owner",
              "pharmacyName": "Test Pharmacy",
              "email": "%s",
              "phone": "0112345678",
              "password": "SecurePass123",
              "licenceNo": "%s",
              "address": "123 Test Rd",
              "district": "COLOMBO",
              "city": "Colombo",
              "latitude": 6.927100,
              "longitude": 79.861200
            }
            """.formatted(email, licenceNo);
    }

    public static String customerRegistration(String email) {
        return """
            { "name": "Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123" }
            """.formatted(email);
    }

    /** Multipart params for a prescription request sent to all pharmacies, with consent. */
    public static RequestPostProcessor prescriptionTargetAll() {
        return prescriptionTarget("targetScope", "ALL");
    }

    /** Multipart params for a prescription request sent within 10 km of the given point, with consent. */
    public static RequestPostProcessor prescriptionTargetRadius(String latitude, String longitude) {
        return prescriptionTarget("targetScope", "RADIUS_10KM", "latitude", latitude, "longitude", longitude);
    }

    /** Multipart params for a prescription request sent to one district, with consent. */
    public static RequestPostProcessor prescriptionTargetDistrict(String district) {
        return prescriptionTarget("targetScope", "DISTRICT", "district", district);
    }

    /** Adds the given name/value pairs plus {@code consent=true} as request parameters. */
    public static RequestPostProcessor prescriptionTarget(String... namesAndValues) {
        return request -> {
            request.addParameter("consent", "true");
            for (int i = 0; i < namesAndValues.length; i += 2) {
                request.setParameter(namesAndValues[i], namesAndValues[i + 1]);
            }
            return request;
        };
    }
}
