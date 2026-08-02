package com.suwalink.IT3003.service;

public interface MailService {

    void sendPasswordResetOtp(String toEmail, String otp);
}
