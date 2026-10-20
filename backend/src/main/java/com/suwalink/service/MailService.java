package com.suwalink.service;

import com.suwalink.entity.User;

public interface MailService {

    /** Emails the reset code to the user, in their preferred language. */
    void sendPasswordResetOtp(User user, String otp);
}
