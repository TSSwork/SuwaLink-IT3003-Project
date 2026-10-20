package com.suwalink.support;

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
}
