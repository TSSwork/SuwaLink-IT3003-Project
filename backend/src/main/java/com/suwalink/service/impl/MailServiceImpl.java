package com.suwalink.service.impl;

import com.suwalink.service.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Value("${app.otp.expiry-minutes}")
    private int otpExpiryMinutes;

    @Override
    public void sendPasswordResetOtp(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("SuwaLink password reset code");
        message.setText(
            "Your SuwaLink password reset code is: " + otp + "\n\n"
                + "This code expires in " + otpExpiryMinutes + " minutes.\n"
                + "If you didn't request this, you can safely ignore this email.");
        mailSender.send(message);
    }
}
