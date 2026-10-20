package com.suwalink.service.impl;

import com.suwalink.dto.request.CustomerRegisterRequest;
import com.suwalink.dto.request.ForgotPasswordRequest;
import com.suwalink.dto.request.LoginRequest;
import com.suwalink.dto.request.PharmacyRegisterRequest;
import com.suwalink.dto.request.ResetPasswordRequest;
import com.suwalink.dto.response.AuthResponse;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.event.PharmacyRegisteredEvent;
import com.suwalink.exception.DuplicateResourceException;
import com.suwalink.exception.EmailAlreadyExistsException;
import com.suwalink.exception.InvalidOtpException;
import com.suwalink.exception.PharmacyNotVerifiedException;
import com.suwalink.exception.ResourceNotFoundException;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.security.JwtService;
import com.suwalink.service.AuthService;
import com.suwalink.service.MailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final MailService mailService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.otp.expiry-minutes}")
    private int otpExpiryMinutes;

    @Override
    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        User saved = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.CUSTOMER);

        String token = jwtService.generateToken(saved.getId(), saved.getEmail(), saved.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(saved.getRole())
            .id(saved.getId())
            .name(saved.getName())
            .build();
    }

    @Override
    @Transactional
    public void registerPharmacy(PharmacyRegisterRequest request) {
        if (pharmacyRepository.existsByLicenceNo(request.getLicenceNo())) {
            throw new DuplicateResourceException(
                "A pharmacy with licence number '" + request.getLicenceNo() + "' already exists");
        }

        User savedUser = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.PHARMACY_OWNER);

        Pharmacy pharmacy = Pharmacy.builder()
            .name(request.getPharmacyName())
            .phone(request.getPhone())
            .district(request.getDistrict())
            .city(request.getCity())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .openingHours(request.getOpeningHours())
            .licenceNo(request.getLicenceNo())
            .address(request.getAddress())
            .status(PharmacyStatus.PENDING)
            .user(savedUser)
            .build();

        Pharmacy saved = pharmacyRepository.save(pharmacy);
        eventPublisher.publishEvent(new PharmacyRegisteredEvent(this, saved.getId(), saved.getName()));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getRole() == Role.PHARMACY_OWNER) {
            Pharmacy pharmacy = pharmacyRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
            if (pharmacy.getStatus() == PharmacyStatus.REJECTED) {
                throw new PharmacyNotVerifiedException("Your pharmacy application was rejected");
            }
            if (pharmacy.getStatus() != PharmacyStatus.VERIFIED) {
                throw new PharmacyNotVerifiedException();
            }
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(user.getRole())
            .id(user.getId())
            .name(user.getName())
            .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // Deliberately don't reveal whether the email is registered - always behave the same way
        // to the caller (see AuthController, which returns one generic message either way).
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String otp = generateOtp();
            user.setResetOtp(otp);
            user.setResetOtpExpiry(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
            userRepository.save(user);

            mailService.sendPasswordResetOtp(user, otp);
        });
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("No account found with that email"));

        if (user.getResetOtp() == null || user.getResetOtpExpiry() == null) {
            throw new InvalidOtpException("No password reset was requested for this account");
        }
        if (LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            throw new InvalidOtpException("This code has expired. Please request a new one");
        }
        if (!constantTimeEquals(user.getResetOtp(), request.getOtp())) {
            throw new InvalidOtpException("Invalid code");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        userRepository.save(user);
    }

    private String generateOtp() {
        int otp = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(otp);
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private User registerUser(String name, String email, String phone, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = User.builder()
            .name(name)
            .email(email)
            .phone(phone)
            .password(passwordEncoder.encode(rawPassword))
            .role(role)
            .termsAcceptedAt(LocalDateTime.now())
            .build();

        return userRepository.save(user);
    }
}
