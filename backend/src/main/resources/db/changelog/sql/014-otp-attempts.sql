-- Wrong password-reset OTP attempts since the current OTP was issued; the OTP is cleared at 5.
ALTER TABLE `users`
  ADD COLUMN `reset_otp_attempts` int NOT NULL DEFAULT 0;
