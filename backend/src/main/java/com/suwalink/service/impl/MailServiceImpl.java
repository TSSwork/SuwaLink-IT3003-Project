package com.suwalink.service.impl;

import com.suwalink.entity.User;
import com.suwalink.service.MailService;
import com.suwalink.util.MessageRenderer;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final MessageRenderer messageRenderer;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.otp.expiry-minutes}")
    private int otpExpiryMinutes;

    @Value("${app.mail.demo-redirect:}")
    private String demoRedirect;

    @Override
    public void sendPasswordResetOtp(User user, String otp) {
        String to = user.isDemo() ? demoRedirect : user.getEmail();
        if (to == null || to.isBlank()) {
            return; // demo user with no redirect configured: never mail a real address
        }
        Locale locale = user.getPreferredLanguage().toLocale();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(messageRenderer.render("email.password-reset.subject", Map.of(), locale));
        message.setText(messageRenderer.render("email.password-reset.body",
                Map.of("otp", otp, "minutes", String.valueOf(otpExpiryMinutes)), locale));
        mailSender.send(message);
    }
}
