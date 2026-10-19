package com.suwalink.service;

public interface MailService {

    void sendPasswordResetOtp(String toEmail, String otp);
}
